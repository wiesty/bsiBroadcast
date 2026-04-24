import { db, advisories, products, syncLog } from '@/lib/db'
import { fetchAdvisoryPage, sleep, FETCH_DELAY_MS, type BsiAdvisory } from './api'
import { eq, desc } from 'drizzle-orm'
import { dispatchNotifications } from '@/lib/notifications'

const SEVERITY_ORDER = ['niedrig', 'mittel', 'hoch', 'kritisch'] as const
type Severity = (typeof SEVERITY_ORDER)[number]

function normalizeSeverity(s?: string): Severity | null {
  if (!s) return null
  const lower = s.toLowerCase()
  if (SEVERITY_ORDER.includes(lower as Severity)) return lower as Severity
  return null
}

export async function runSync(): Promise<{ newCount: number; updatedCount: number; totalFetched: number }> {
  const [logEntry] = await db
    .insert(syncLog)
    .values({ startedAt: new Date(), status: 'running' })
    .returning()

  let newCount = 0
  let updatedCount = 0
  let totalFetched = 0

  try {
    const allNew: BsiAdvisory[] = []
    let page = 0
    const PAGE_SIZE = 50
    let reachedKnown = false

    const recentKnown = await db
      .select({ uuid: advisories.uuid })
      .from(advisories)
      .orderBy(desc(advisories.published))
      .limit(500)
    const knownUuids = new Set(recentKnown.map((r) => r.uuid))

    while (!reachedKnown) {
      const data = await fetchAdvisoryPage(page, PAGE_SIZE)
      totalFetched += data.content.length

      for (const advisory of data.content) {
        if (knownUuids.has(advisory.uuid)) {
          reachedKnown = true
          break
        }
        allNew.push(advisory)
      }

      if (reachedKnown || page >= data.totalPages - 1 || page >= 20) break
      page++
    }

    const newAdvisoriesToNotify: typeof advisories.$inferInsert[] = []

    for (const advisory of allNew) {
      const now = new Date()
      const publishedMs = new Date(advisory.published).getTime()

      const existing = await db
        .select({ uuid: advisories.uuid })
        .from(advisories)
        .where(eq(advisories.uuid, advisory.uuid))
        .limit(1)

      if (existing.length === 0) {
        const row: typeof advisories.$inferInsert = {
          uuid: advisory.uuid,
          name: advisory.name,
          title: advisory.title,
          published: new Date(publishedMs),
          basescore: advisory.basescore ?? null,
          temporalscore: advisory.temporalscore ?? null,
          classification: normalizeSeverity(advisory.classification),
          status: advisory.status ?? null,
          productNames: advisory.productNames ?? [],
          cves: advisory.cves ?? [],
          noPatch: advisory.noPatch ?? false,
          createdAt: now,
          updatedAt: now,
        }
        await db.insert(advisories).values(row)
        newCount++
        newAdvisoriesToNotify.push(row)
      } else {
        await db
          .update(advisories)
          .set({
            title: advisory.title,
            basescore: advisory.basescore ?? null,
            temporalscore: advisory.temporalscore ?? null,
            classification: normalizeSeverity(advisory.classification),
            status: advisory.status ?? null,
            productNames: advisory.productNames ?? [],
            cves: advisory.cves ?? [],
            noPatch: advisory.noPatch ?? false,
            updatedAt: now,
          })
          .where(eq(advisories.uuid, advisory.uuid))
        updatedCount++
      }

      if (advisory.productNames?.length) {
        for (const name of advisory.productNames) {
          const existing = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.name, name))
            .limit(1)

          if (existing.length === 0) {
            await db.insert(products).values({
              name,
              watched: false,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            })
          } else {
            await db
              .update(products)
              .set({ lastSeenAt: new Date() })
              .where(eq(products.name, name))
          }
        }
      }
    }

    if (newAdvisoriesToNotify.length > 0) {
      await dispatchNotifications(newAdvisoriesToNotify)
    }

    await db
      .update(syncLog)
      .set({ finishedAt: new Date(), status: 'success', newCount, updatedCount, totalFetched })
      .where(eq(syncLog.id, logEntry.id))

    return { newCount, updatedCount, totalFetched }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db
      .update(syncLog)
      .set({ finishedAt: new Date(), status: 'error', error: message, totalFetched })
      .where(eq(syncLog.id, logEntry.id))
    throw err
  }
}

async function upsertPage(pageAdvisories: BsiAdvisory[]): Promise<number> {
  const now = new Date()
  let imported = 0

  for (const advisory of pageAdvisories) {
    const existing = await db
      .select({ uuid: advisories.uuid })
      .from(advisories)
      .where(eq(advisories.uuid, advisory.uuid))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(advisories).values({
        uuid: advisory.uuid,
        name: advisory.name,
        title: advisory.title,
        published: new Date(advisory.published),
        basescore: advisory.basescore ?? null,
        temporalscore: advisory.temporalscore ?? null,
        classification: normalizeSeverity(advisory.classification),
        status: advisory.status ?? null,
        productNames: advisory.productNames ?? [],
        cves: advisory.cves ?? [],
        noPatch: advisory.noPatch ?? false,
        createdAt: now,
        updatedAt: now,
      })
      imported++
    }

    if (advisory.productNames?.length) {
      for (const name of advisory.productNames) {
        const existingProd = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.name, name))
          .limit(1)

        if (existingProd.length === 0) {
          await db.insert(products).values({
            name,
            watched: false,
            firstSeenAt: now,
            lastSeenAt: now,
          })
        }
      }
    }
  }

  return imported
}

export async function runInitialImport(
  onProgress?: (done: number, total: number, imported: number) => void
): Promise<number> {
  const first = await fetchAdvisoryPage(0, 150)
  const totalPages = first.totalPages
  const total = first.totalElements
  let processed = 0
  let imported = 0

  imported += await upsertPage(first.content)
  processed += first.content.length
  onProgress?.(processed, total, imported)

  for (let page = 1; page < totalPages; page++) {
    await sleep(FETCH_DELAY_MS)
    const data = await fetchAdvisoryPage(page, 150)
    imported += await upsertPage(data.content)
    processed += data.content.length
    onProgress?.(processed, total, imported)
  }

  return imported
}
