# Compare Cloud Costs — Community Edition

An open-source, self-hostable cloud pricing comparison dashboard. Compares
pricing across AWS, Azure, GCP, Oracle, DigitalOcean, and Alibaba Cloud
across 12 product categories — compute, databases, serverless, containers,
networking, storage, data analytics, AI, and app hosting.

This is the community edition of [Compare Cloud Costs](https://comparecloudcosts.com).
It covers the core pricing comparison only. Workload calculators, data center
compliance mapping, and premium features (bring-your-own-bill, bring-your-own-architecture,
etc.) are part of the hosted product and not included here.

## License

Licensed under [AGPL-3.0](./LICENSE). If you modify this code and run it as
a network service, you're required to make your modified source available to
your users under the same license.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- PostgreSQL via `postgres` (postgres.js)
- Tailwind CSS v4

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to a Postgres instance
   you control.
3. Apply the schema:
   ```bash
   psql "$DATABASE_URL" -f src/db/schema.sql
   ```
4. Populate pricing data. Two options:
   - Run the one-off scraper/ingest script (uses Playwright, slower, pulls
     live prices where available):
     ```bash
     npm run ingest
     ```
   - Or run the background worker, which does an initial fetch on startup in
     dev mode and then refreshes weekly:
     ```bash
     npm run worker
     ```
5. Start the app:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000.

## Production build

```bash
npm run build
npm run start
```

## What's not included here

- Workload calculators, data center/compliance pages, sponsorships — part of
  the public hosted edition at comparecloudcosts.com.
- Bring-your-own-bill, bring-your-own-architecture, and other premium
  features — part of the paid edition.
- Email alerting for stale/low-quality data (requires SMTP config) — omitted
  to keep this edition dependency-light. The pipelines still write
  `updated_at` timestamps you can monitor yourself.
- Admin API routes — build your own if you need remote-triggered re-fetching;
  `ADMIN_API_KEY` auth scaffolding is still in `src/lib/api-utils.ts`.
