import { db } from './index'
import { sql } from 'drizzle-orm'

export function runMigrations() {
  db.run(sql`
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

  db.run(sql`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      watched INTEGER DEFAULT 0 NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    )
  `)

  db.run(sql`
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

  db.run(sql`
    CREATE TABLE IF NOT EXISTS notification_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      webhook_url TEXT NOT NULL,
      enabled INTEGER DEFAULT 1 NOT NULL,
      min_severity TEXT DEFAULT 'niedrig' NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      advisory_uuid TEXT NOT NULL REFERENCES advisories(uuid),
      config_id INTEGER NOT NULL REFERENCES notification_config(id),
      sent_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      error TEXT
    )
  `)

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_advisories_published ON advisories(published DESC)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_advisories_classification ON advisories(classification)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_notification_log_advisory ON notification_log(advisory_uuid)`)

  // Non-destructive column additions
  try { db.run(sql`ALTER TABLE notification_config ADD COLUMN config TEXT DEFAULT '{}'`) } catch {}
  try { db.run(sql`ALTER TABLE notification_config ADD COLUMN webhook_url_nullable TEXT`) } catch {}
}
