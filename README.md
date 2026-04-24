<div align="center">
  <img src="public/brudi.png" alt="BSI Broadcast" width="72" />
  <h1>BSI Broadcast</h1>
  <p>Self-hosted monitor for <a href="https://wid.cert-bund.de">BSI WID</a> security advisories — with notifications, a product watchlist, and a clean dashboard.</p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs" />
    <img alt="SQLite" src="https://img.shields.io/badge/SQLite-Drizzle-blue?style=flat-square&logo=sqlite" />
    <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  </p>
</div>

---

## Features

- **Dashboard** — advisory list with severity filters, full-text search, and pagination
- **Advisory detail pages** — enriched with BSI Content API data: description, CVEs, CVSS scores, revision history, external references
- **Product watchlist** — subscribe to specific products; notifications only fire for those
- **Notifications** — 6 channels out of the box: Discord, Slack, Microsoft Teams, Telegram, Ntfy, Generic Webhook
- **Per-channel severity threshold** — e.g. only *Kritisch* on PagerDuty, everything on Slack
- **Sync** — delta sync every 15 minutes; full import of all ~13 000 BSI advisories on first start
- **SQLite** — zero external database dependency, single file, easy backup

## Quickstart (Docker)

```yaml
# docker-compose.yml
services:
  bsibroadcast:
    image: ghcr.io/wiesty/bsibroadcast:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). On first start the app imports all BSI advisories automatically (~2–3 minutes, rate-limited to 1 page/second out of respect for the BSI API).

## Development

**Requirements:** Node 22+

```bash
git clone https://github.com/wiesty/bsibroadcast
cd bsibroadcast
npm install

# local database
echo "DB_PATH=./data/dev.db" > .env.local
mkdir -p data

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `/app/data/bsibroadcast.db` | Path to the SQLite database file |
| `SYNC_INTERVAL_MS` | `900000` | Sync interval in ms (default: 15 min) |

## Docker Build

The image is built via **GitHub Actions → Docker Build & Push → Run workflow** (manual trigger). Optionally set a tag — defaults to `latest`. Published to `ghcr.io/wiesty/bsibroadcast`.

To build locally:

```bash
docker build -t bsibroadcast .
docker run -p 3000:3000 -v $(pwd)/data:/app/data bsibroadcast
```

## Notification Channels

| Channel | What you need |
|---|---|
| Discord | Webhook URL |
| Slack | Incoming Webhook URL |
| Microsoft Teams | Incoming Webhook URL |
| Telegram | Bot Token + Chat ID |
| Ntfy | Server URL + Topic (+ optional token) |
| Generic Webhook | URL, method, optional headers (JSON) |

Configure channels in **Einstellungen → Benachrichtigungskanäle**.

## Tech Stack

- [Next.js 16](https://nextjs.org) — App Router, Server Components, Route Handlers
- [Drizzle ORM](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Lucide React](https://lucide.dev)

## License

MIT
