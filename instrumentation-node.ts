import { runMigrations } from '@/lib/db/migrate'
import { db, advisories, syncLog } from '@/lib/db'
import { count, eq, desc } from 'drizzle-orm'

const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS ?? '900000') // 15 min default

async function initAndSync() {
  try {
    runMigrations()

    const [{ total }] = await db.select({ total: count() }).from(advisories)

    if (total === 0) {
      console.log('[BSI] Empty DB — starting initial import...')
      const { runInitialImport } = await import('@/lib/bsi/sync')
      const imported = await runInitialImport((done, t) => {
        if (done % 500 === 0) console.log(`[BSI] Import progress: ${done}/${t}`)
      })
      console.log(`[BSI] Initial import complete: ${imported} advisories`)
    } else {
      console.log(`[BSI] DB has ${total} advisories — running delta sync`)
      const { runSync } = await import('@/lib/bsi/sync')
      const result = await runSync()
      console.log(`[BSI] Sync complete: ${result.newCount} new, ${result.updatedCount} updated`)
    }
  } catch (err) {
    console.error('[BSI] Startup sync failed:', err)
  }

  setInterval(async () => {
    try {
      const { runSync } = await import('@/lib/bsi/sync')
      const result = await runSync()
      if (result.newCount > 0 || result.updatedCount > 0) {
        console.log(`[BSI] Sync: ${result.newCount} new, ${result.updatedCount} updated`)
      }
    } catch (err) {
      console.error('[BSI] Periodic sync failed:', err)
    }
  }, SYNC_INTERVAL_MS)
}

initAndSync()
