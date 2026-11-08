import assert from 'node:assert/strict'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { runMigrations } from './migrate'
import * as schema from './schema'

function createDatabase() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  return { sqlite, database: drizzle(sqlite, { schema }) }
}

test('new databases accept notification channels without a legacy webhook URL', (t) => {
  const { sqlite, database } = createDatabase()
  t.after(() => sqlite.close())
  runMigrations(database)

  for (const type of ['webhook', 'telegram', 'ntfy'] as const) {
    const created = database.insert(schema.notificationConfig).values({
      type,
      name: type,
      webhookUrl: null,
      config: { url: 'https://example.com/webhook' },
    }).returning().get()
    assert.equal(created.webhookUrl, null)
    assert.equal(created.type, type)
  }
})

for (const hasConfig of [false, true]) {
  test(`legacy migration preserves channels and history (config column: ${hasConfig})`, (t) => {
    const { sqlite, database } = createDatabase()
    t.after(() => sqlite.close())
    runMigrations(database)
    sqlite.exec(`
      DROP TABLE notification_log;
      DROP TABLE notification_config;
      CREATE TABLE notification_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        ${hasConfig ? "config TEXT DEFAULT '{}', webhook_url_nullable TEXT," : ''}
        enabled INTEGER DEFAULT 1 NOT NULL,
        min_severity TEXT DEFAULT 'niedrig' NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE notification_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        advisory_uuid TEXT NOT NULL REFERENCES advisories(uuid),
        config_id INTEGER NOT NULL REFERENCES notification_config(id),
        sent_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        error TEXT
      );
      INSERT INTO notification_config
        (id, type, name, webhook_url, enabled, min_severity, created_at)
      VALUES (42, 'discord', 'Existing channel', 'https://example.com/discord', 0, 'hoch', 123);
      INSERT INTO advisories (uuid, name, title, published, created_at, updated_at)
      VALUES ('advisory-1', 'WID-1', 'Existing advisory', 123, 123, 123);
      INSERT INTO notification_log (advisory_uuid, config_id, sent_at, status)
      VALUES ('advisory-1', 42, 123, 'success');
    `)
    if (hasConfig) {
      sqlite.prepare('UPDATE notification_config SET config = ? WHERE id = 42')
        .run(JSON.stringify({ webhookUrl: 'https://example.com/discord' }))
    }
    const originalChannel = sqlite.prepare('SELECT * FROM notification_config').get() as Record<string, unknown>
    const originalHistory = sqlite.prepare('SELECT * FROM notification_log').all()

    runMigrations(database)
    runMigrations(database)

    const expectedChannel = { ...originalChannel }
    delete expectedChannel.webhook_url_nullable
    assert.deepEqual(sqlite.prepare('SELECT * FROM notification_config WHERE id = 42').get(), {
      ...expectedChannel,
      config: hasConfig ? originalChannel.config : '{}',
    })
    assert.deepEqual(sqlite.prepare('SELECT * FROM notification_log').all(), originalHistory)
    assert.deepEqual(sqlite.pragma('foreign_key_check'), [])
    assert.equal(sqlite.pragma('foreign_keys', { simple: true }), 1)

    const created = database.insert(schema.notificationConfig).values({
      type: 'webhook',
      name: 'Generic Webhook',
      config: { url: 'https://example.com/webhook', method: 'POST' },
    }).returning().get()
    assert.equal(created.webhookUrl, null)
    assert.ok(created.id > 42)

    sqlite.prepare('DELETE FROM notification_config WHERE id = 42').run()
    assert.deepEqual(sqlite.prepare('SELECT * FROM notification_log').all(), [
      { ...(originalHistory[0] as Record<string, unknown>), config_id: null },
    ])
    assert.deepEqual(sqlite.pragma('foreign_key_check'), [])
    assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'idx_notification_log_advisory'").get())
  })
}

test('a failed migration rolls back the table replacement and restores foreign keys', (t) => {
  const { sqlite, database } = createDatabase()
  t.after(() => sqlite.close())
  runMigrations(database)
  sqlite.pragma('foreign_keys = OFF')
  sqlite.exec(`
    DROP TABLE notification_config;
    CREATE TABLE notification_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      webhook_url TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1 NOT NULL,
      min_severity TEXT DEFAULT 'niedrig' NOT NULL,
      created_at INTEGER NOT NULL
    );
    INSERT INTO notification_log (advisory_uuid, config_id, sent_at, status)
    VALUES ('missing-advisory', 999, 123, 'success');
  `)
  sqlite.pragma('foreign_keys = ON')

  assert.throws(() => runMigrations(database), /history references/)
  assert.equal(sqlite.pragma('foreign_keys', { simple: true }), 1)
  const columns = sqlite.pragma('table_info(notification_config)') as { name: string; notnull: number }[]
  assert.equal(columns.find((column) => column.name === 'webhook_url')?.notnull, 1)
  assert.equal(sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'notification_config_new'").get(), undefined)
})
