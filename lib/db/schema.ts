import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const advisories = sqliteTable('advisories', {
  uuid: text('uuid').primaryKey(),
  name: text('name').notNull().unique(),
  title: text('title').notNull(),
  published: integer('published', { mode: 'timestamp_ms' }).notNull(),
  basescore: real('basescore'),
  temporalscore: real('temporalscore'),
  classification: text('classification', { enum: ['niedrig', 'mittel', 'hoch', 'kritisch'] }),
  status: text('status'),
  productNames: text('product_names', { mode: 'json' }).$type<string[]>().default([]),
  cves: text('cves', { mode: 'json' }).$type<string[]>().default([]),
  noPatch: integer('no_patch', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  watched: integer('watched', { mode: 'boolean' }).default(false).notNull(),
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
})

export const syncLog = sqliteTable('sync_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
  status: text('status', { enum: ['running', 'success', 'error'] }).notNull().default('running'),
  newCount: integer('new_count').default(0),
  updatedCount: integer('updated_count').default(0),
  totalFetched: integer('total_fetched').default(0),
  error: text('error'),
})

export const PROVIDER_TYPES = ['discord', 'slack', 'teams', 'telegram', 'ntfy', 'webhook'] as const
export type ProviderType = (typeof PROVIDER_TYPES)[number]

export const notificationConfig = sqliteTable('notification_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').$type<ProviderType>().notNull(),
  name: text('name').notNull(),
  webhookUrl: text('webhook_url'),
  config: text('config', { mode: 'json' }).$type<Record<string, string>>().default({}),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  minSeverity: text('min_severity', { enum: ['niedrig', 'mittel', 'hoch', 'kritisch'] }).default('niedrig').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
})

export const notificationLog = sqliteTable('notification_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  advisoryUuid: text('advisory_uuid').notNull().references(() => advisories.uuid),
  configId: integer('config_id').notNull().references(() => notificationConfig.id),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  status: text('status', { enum: ['success', 'error'] }).notNull(),
  error: text('error'),
})

export type Advisory = typeof advisories.$inferSelect
export type NewAdvisory = typeof advisories.$inferInsert
export type Product = typeof products.$inferSelect
export type SyncLog = typeof syncLog.$inferSelect
export type NotificationConfig = typeof notificationConfig.$inferSelect
export type NotificationLog = typeof notificationLog.$inferSelect
