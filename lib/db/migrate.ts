import { db } from './index'
import { sql } from 'drizzle-orm'

export function runMigrations(database = db) {
  database.run(sql`
    CREATE TABLE IF NOT EXISTS advisories (
      uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      published INTEGER NOT NULL,
      basescore REAL,
      temporalscore REAL,
      classification TEXT,
      status TEXT,
      product_names TEXT DEFAULT '[]',
      cves TEXT DEFAULT '[]',
      no_patch INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  database.run(sql`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      watched INTEGER DEFAULT 0 NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    )
  `)

  database.run(sql`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      status TEXT NOT NULL DEFAULT 'running',
      new_count INTEGER DEFAULT 0,
      updated_count INTEGER DEFAULT 0,
      total_fetched INTEGER DEFAULT 0,
      error TEXT
    )
  `)

  database.run(sql`
    CREATE TABLE IF NOT EXISTS notification_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      webhook_url TEXT,
      config TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1 NOT NULL,
      min_severity TEXT DEFAULT 'niedrig' NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  database.run(sql`
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      advisory_uuid TEXT NOT NULL REFERENCES advisories(uuid),
      config_id INTEGER REFERENCES notification_config(id) ON DELETE SET NULL,
      sent_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      error TEXT
    )
  `)

  database.run(sql`CREATE INDEX IF NOT EXISTS idx_advisories_published ON advisories(published DESC)`)
  database.run(sql`CREATE INDEX IF NOT EXISTS idx_advisories_classification ON advisories(classification)`)

  const sqlite = database.$client
  const columns = sqlite.pragma('table_info(notification_config)') as { name: string; notnull: number }[]
  if (!columns.some((column) => column.name === 'config')) {
    database.run(sql`ALTER TABLE notification_config ADD COLUMN config TEXT DEFAULT '{}'`)
  }

  if (columns.some((column) => column.name === 'webhook_url' && column.notnull === 1)) {
    // SQLite requires rebuilding the table to remove NOT NULL. Disable foreign
    // keys outside the transaction so notification_log keeps its references.
    const foreignKeys = sqlite.pragma('foreign_keys', { simple: true })
    sqlite.pragma('foreign_keys = OFF')
    try {
      sqlite.transaction(() => {
        sqlite.exec(`
          CREATE TABLE notification_config_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            webhook_url TEXT,
            config TEXT DEFAULT '{}',
            enabled INTEGER DEFAULT 1 NOT NULL,
            min_severity TEXT DEFAULT 'niedrig' NOT NULL,
            created_at INTEGER NOT NULL
          );
          INSERT INTO notification_config_new
            (id, type, name, webhook_url, config, enabled, min_severity, created_at)
          SELECT id, type, name, webhook_url, config, enabled, min_severity, created_at
          FROM notification_config;
          DROP TABLE notification_config;
          ALTER TABLE notification_config_new RENAME TO notification_config;
        `)
        if (sqlite.prepare('PRAGMA foreign_key_check(notification_log)').all().length > 0) {
          throw new Error('Notification migration would break history references')
        }
      })()
    } finally {
      sqlite.pragma(`foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`)
    }
  }

  const logForeignKeys = sqlite.pragma('foreign_key_list(notification_log)') as { from: string; on_delete: string }[]
  if (!logForeignKeys.some((key) => key.from === 'config_id' && key.on_delete === 'SET NULL')) {
    sqlite.transaction(() => {
      sqlite.exec(`
        CREATE TABLE notification_log_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          advisory_uuid TEXT NOT NULL REFERENCES advisories(uuid),
          config_id INTEGER REFERENCES notification_config(id) ON DELETE SET NULL,
          sent_at INTEGER NOT NULL,
          status TEXT NOT NULL,
          error TEXT
        );
        INSERT INTO notification_log_new (id, advisory_uuid, config_id, sent_at, status, error)
        SELECT id, advisory_uuid, config_id, sent_at, status, error FROM notification_log;
        DROP TABLE notification_log;
        ALTER TABLE notification_log_new RENAME TO notification_log;
      `)
    })()
  }
  database.run(sql`CREATE INDEX IF NOT EXISTS idx_notification_log_advisory ON notification_log(advisory_uuid)`)
}
