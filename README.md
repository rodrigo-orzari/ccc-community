# Compare Cloud Costs — Community Edition

An open-source, self-hostable cloud pricing comparison application. Compares pricing across **AWS, Azure, GCP, Oracle Cloud, DigitalOcean, and Alibaba Cloud** across 12 core product categories — compute VMs, databases, serverless, containers, networking, storage, data analytics, AI models, and app hosting.

This is the community edition of [Compare Cloud Costs](https://comparecloudcosts.com). It covers core multi-cloud pricing comparisons and ingestion pipelines for independent deployment in your own environment.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **PostgreSQL**: v14.0 or higher
- **System Memory**: 2 GB RAM minimum (4 GB recommended if running Playwright live scrapers)

---

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Database**: PostgreSQL via `postgres` (postgres.js)
- **Styling**: Vanilla CSS + Tailwind CSS v4
- **Ingestion**: Node.js pipelines + Playwright headless scrapers

---

## Quick Start & Installation

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/rodrigo-orzari/ccc-community.git
cd ccc-community
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and set your Postgres connection string:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ccc_community
```

### 3. Initialize the Database Schema

Create your database and run the schema file:

```bash
createdb ccc_community
psql "$DATABASE_URL" -f src/db/schema.sql
```

### 4. Populate Pricing Data

Populate pricing records using one of two ingestion options:

- **One-off Ingestion Pipeline** (runs all category scrapers and normalizes SKUs):
  ```bash
  npm run ingest
  ```
- **Automated Background Worker** (runs an initial fetch on startup and refreshes pricing weekly):
  ```bash
  npm run worker
  ```

### 5. Launch the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment

To build and run in production mode:

```bash
npm run build
npm run start
```

---

## Environment Variables Reference

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/dbname`) |
| `DATABASE_CA_CERT` | No | Base64-encoded TLS CA certificate if using managed Postgres requiring custom SSL |
| `DIGITALOCEAN_API_TOKEN` | No | Enables live DigitalOcean API pricing fetch (falls back to static config if omitted) |
| `ALIBABA_ACCESS_KEY_ID` | No | Enables live Alibaba Cloud API pricing fetch |
| `ALIBABA_ACCESS_KEY_SECRET` | No | Secret key for Alibaba Cloud API pricing pipeline |
| `GCP_BILLING_API_KEY` | No | Enables live Google Cloud Billing Catalog API fetch |
| `ADMIN_API_KEY` | No | Secret key for custom administrative API endpoints |

---

## What's Included vs. Hosted Edition

| Feature | Community Edition | Hosted / Premium |
| :--- | :---: | :---: |
| **Multi-Cloud Pricing Comparison Tables** | ✅ | ✅ |
| **Provider Pricing Pipelines & Scrapers** | ✅ | ✅ |
| **12 Core Categories & Filtering** | ✅ | ✅ |
| **Self-Hostable PostgreSQL Backend** | ✅ | ✅ |
| **Bring Your Estimate / Bill / Architecture Parsers** | ❌ | ✅ |
| **Datacenters & Compliance Mapping** | ❌ | ✅ |
| **Workload Blueprint Generator** | ❌ | ✅ |

---

## License

Licensed under [AGPL-3.0](./LICENSE). If you modify this code and run it as a network service, you are required to make your modified source code available to your users under the same license.
