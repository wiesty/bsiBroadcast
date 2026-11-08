import { db, notificationConfig, notificationLog, products } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { createProvider } from './providers'
import type { NotificationPayload } from './types'

export type { NotificationPayload } from './types'

const SEVERITY_ORDER = ['niedrig', 'mittel', 'hoch', 'kritisch'] as const

function severityIndex(s: string | null): number {
  return SEVERITY_ORDER.indexOf((s ?? 'niedrig') as (typeof SEVERITY_ORDER)[number])
}

export async function dispatchNotifications(
  newAdvisories: Array<{
    uuid: string
    name: string
    title: string
    classification?: string | null
    basescore?: number | null
    cves?: string[] | null
    productNames?: string[] | null
    status?: string | null
    noPatch?: boolean | null
    published: Date
  }>
): Promise<void> {
  const configs = await db
    .select()
    .from(notificationConfig)
    .where(eq(notificationConfig.enabled, true))

  if (configs.length === 0) return

  const watchedProducts = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.watched, true))

  const watchedSet = new Set(watchedProducts.map((p) => p.name))
  const hasWatchlist = watchedSet.size > 0

  for (const advisory of newAdvisories) {
    const productNames = advisory.productNames ?? []

    if (hasWatchlist && !productNames.some((p) => watchedSet.has(p))) continue

    const payload: NotificationPayload = {
      uuid: advisory.uuid,
      name: advisory.name,
      title: advisory.title,
      classification: advisory.classification ?? null,
      basescore: advisory.basescore ?? null,
      cves: advisory.cves ?? [],
      productNames,
      status: advisory.status ?? null,
      noPatch: advisory.noPatch ?? false,
      published: advisory.published,
      url: `https://wid.cert-bund.de/portal/wid/securityadvisory?name=${advisory.name}`,
    }

    for (const config of configs) {
      if (severityIndex(advisory.classification ?? null) < severityIndex(config.minSeverity)) continue

      try {
        const provider = createProvider(config)
        await provider.send(payload)
        await db.insert(notificationLog).values({
          advisoryUuid: advisory.uuid,
          configId: config.id,
          sentAt: new Date(),
          status: 'success',
        })
      } catch (err) {
        await db.insert(notificationLog).values({
          advisoryUuid: advisory.uuid,
          configId: config.id,
          sentAt: new Date(),
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
}
