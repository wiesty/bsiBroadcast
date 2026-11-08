import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { NextRequest } from 'next/server'
import * as schema from '@/lib/db/schema'
import { runMigrations } from '@/lib/db/migrate'
import { POST as create } from './route'
import { DELETE as remove } from './[id]/route'
import { POST as sendTest } from './test/route'

function request(body: unknown) {
  return new NextRequest('http://localhost/api/settings/webhooks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

function createDatabase(t: TestContext) {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  globalThis.__db = drizzle(sqlite, { schema })
  runMigrations(globalThis.__db)
  t.after(() => { globalThis.__db = undefined; sqlite.close() })
  return sqlite
}

test('generic channels can be created and deleted while keeping notification history', async (t) => {
  const sqlite = createDatabase(t)
  const response = await create(request({ name: 'Generic channel', type: 'webhook', config: { url: 'https://example.com/hook' } }))
  assert.equal(response.status, 201)
  const channel = await response.json()
  assert.equal(channel.webhookUrl, null)
  assert.equal(channel.config.method, 'POST')
  sqlite.exec("INSERT INTO advisories (uuid, name, title, published, created_at, updated_at) VALUES ('a', 'a', 'a', 1, 1, 1)")
  sqlite.prepare("INSERT INTO notification_log (advisory_uuid, config_id, sent_at, status) VALUES ('a', ?, 1, 'success')").run(channel.id)

  const deleted = await remove(request({}), { params: Promise.resolve({ id: String(channel.id) }) })
  assert.equal(deleted.status, 200)
  assert.deepEqual(await deleted.json(), { success: true })
  assert.deepEqual(sqlite.prepare('SELECT config_id, status FROM notification_log').get(), { config_id: null, status: 'success' })
  assert.equal(sqlite.prepare('SELECT * FROM notification_config').get(), undefined)
  assert.deepEqual(sqlite.pragma('foreign_key_check'), [])
  assert.equal((await remove(request({}), { params: Promise.resolve({ id: String(channel.id) }) })).status, 404)
  assert.equal((await remove(request({}), { params: Promise.resolve({ id: '1invalid' }) })).status, 400)
})

test('test notification uses the draft method, headers and complete payload without saving', async (t) => {
  const sqlite = createDatabase(t)
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://example.com/draft')
    assert.equal(init.method, 'PUT')
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer test-token')
    const payload = JSON.parse(init.body as string)
    assert.deepEqual(Object.keys(payload).sort(), ['uuid', 'name', 'title', 'classification', 'basescore', 'cves', 'productNames', 'status', 'noPatch', 'published', 'url'].sort())
    assert.equal(payload.status, 'TEST')
    assert.match(payload.title, /Testbenachrichtigung/)
    assert.ok(!Number.isNaN(Date.parse(payload.published)))
    return new Response(null, { status: 204 })
  })
  const response = await sendTest(request({ type: 'webhook', config: {
    url: 'https://example.com/draft', method: 'put', headers: '{"Authorization":"Bearer test-token"}',
  } }))
  assert.equal(response.status, 200)
  assert.equal(fetchMock.mock.callCount(), 1)
  assert.deepEqual(sqlite.prepare('SELECT * FROM notification_config').all(), [])
  assert.deepEqual(sqlite.prepare('SELECT * FROM notification_log').all(), [])
})

for (const [type, config, destination] of [
  ['discord', { webhookUrl: 'https://example.com/discord' }, 'https://example.com/discord'],
  ['slack', { webhookUrl: 'https://example.com/slack' }, 'https://example.com/slack'],
  ['teams', { webhookUrl: 'https://example.com/teams' }, 'https://example.com/teams'],
  ['telegram', { botToken: 'test-token', chatId: '123' }, 'https://api.telegram.org/bottest-token/sendMessage'],
  ['ntfy', { serverUrl: 'https://example.com', topic: 'alerts' }, 'https://example.com/alerts'],
] as const) {
  test(`${type} draft can send a test notification`, async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string) => {
      assert.equal(url, destination)
      return new Response(null, { status: 204 })
    })
    const response = await sendTest(request({ type, config }))
    assert.equal(response.status, 200)
    assert.equal(fetchMock.mock.callCount(), 1)
  })
}

test('invalid draft settings are rejected before sending', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not send') })
  for (const body of [
    null, {}, { type: 'unknown', config: {} }, { type: 'webhook', config: { url: '' } },
    { type: 'webhook', config: { url: 'file:///tmp/test' } },
    { type: 'webhook', config: { url: 'https://example.com', method: 'GET' } },
    { type: 'webhook', config: { url: 'https://example.com', headers: '{' } },
    { type: 'webhook', config: { url: 'https://example.com', headers: '[]' } },
  ]) {
    assert.equal((await sendTest(request(body))).status, 400)
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('failed test delivery returns an actionable error without leaking credentials', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('secret-token') })
  const response = await sendTest(request({ type: 'telegram', config: { botToken: 'secret-token', chatId: '123' } }))
  assert.equal(response.status, 502)
  const result = await response.json()
  assert.match(result.error, /Zugangsdaten/)
  assert.doesNotMatch(result.error, /secret-token/)
})

test('database failures return JSON errors', async (t) => {
  const sqlite = createDatabase(t)
  t.mock.method(console, 'error', () => {})
  sqlite.exec('DROP TABLE notification_config')
  const response = await create(request({ name: 'Channel', type: 'webhook', config: { url: 'https://example.com/hook' } }))
  assert.equal(response.status, 500)
  assert.equal(typeof (await response.json()).error, 'string')
  const deleted = await remove(request({}), { params: Promise.resolve({ id: '1' }) })
  assert.equal(deleted.status, 500)
  assert.equal(typeof (await deleted.json()).error, 'string')
})
