import postgres from 'postgres';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { PricingPipeline } from '../services/pricing_pipeline.ts';
import { DatabasePricingPipeline } from '../services/database_pipeline.ts';
import { ServerlessPricingPipeline } from '../services/serverless_pipeline.ts';
import { ContainersPricingPipeline } from '../services/containers_pipeline.ts';
import { ContainersRegistryPricingPipeline } from '../services/containers_registry_pipeline.ts';
import { DataAnalyticsPricingPipeline } from '../services/data_analytics_pipeline.ts';
import { NetworkingPricingPipeline } from '../services/networking_pipeline.ts';
import { StoragePricingPipeline } from '../services/storage_pipeline.ts';
import { AppHostingPricingPipeline } from '../services/app_hosting_pipeline.ts';
import { IntegrationPricingPipeline } from '../services/integration_pipeline.ts';
import { SecurityPricingPipeline } from '../services/security_pipeline.ts';
import { AIPricingPipeline } from '../services/ai_pipeline.ts';
import { TimeSeriesPricingPipeline } from '../services/time_series_pipeline.ts';
import { GraphDatabasePricingPipeline } from '../services/graph_database_pipeline.ts';
import { SearchEnginePricingPipeline } from '../services/search_engine_pipeline.ts';
import { InferenceEndpointsPricingPipeline } from '../services/inference_endpoints_pipeline.ts';
import { clearCache } from '../lib/cache.ts';

dotenv.config();

console.log('🚀 Starting Background Ingestion Worker...');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Worker cannot connect to the database.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_CA_CERT ? {
    // Verify the server cert against the provided CA (prevents MITM on the DB link).
    rejectUnauthorized: true,
    ca: Buffer.from(process.env.DATABASE_CA_CERT, 'base64')
  } : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  // ✅ FIXED: Production now enforces TLS validation (was: { rejectUnauthorized: false })
  // If production deployment fails with certificate errors, ensure DATABASE_CA_CERT is set
});

async function checkSparseData() {
  try {
    const res = await sql.unsafe(`
      SELECT p.slug, COUNT(pr.id) as count
      FROM providers p
      LEFT JOIN services s ON s.provider_id = p.id
      LEFT JOIN pricing_records pr ON pr.service_id = s.id
      GROUP BY p.slug
    `);
    const needsFetch = res.some(r => parseInt(r.count) < 5);

    if (needsFetch) {
      console.log('🚀 Some providers have sparse data. Triggering immediate pricing update...');
      const pipeline = new PricingPipeline(sql as any);
      const results = await pipeline.run();
      console.log('✅ Initial sparse-data pipeline fetch completed:', results);
    } else {
      console.log('✅ Database looks populated. No immediate fetch required.');
    }
  } catch (err) {
    console.error('❌ Error checking database state:', err);
  }
}

// 1. Initial Auto-Init Check (Runs once on worker startup)
if (process.env.NODE_ENV !== 'production') {
  // We only run this in dev so we don't accidentally throttle APIs during production boot.
  // In production, data should be seeded via /api/admin/fetch-pricing or the cron job.
  checkSparseData();
} else {
  console.log('📌 Production mode: skipping auto-pricing fetch on startup.');
}

// 2. Automated Background Jobs (Runs every Sunday at midnight)
cron.schedule('0 0 * * 0', async () => {
  console.log('🕒 Starting scheduled pricing pipeline update...');
  try {
    // Keep this list in sync with ingest.ts's pipeline set — a pipeline missing
    // here never gets refreshed unattended, only via a manual admin fetch.
    const pipelines = [
      new PricingPipeline(sql as any),
      new DatabasePricingPipeline(sql as any),
      new ServerlessPricingPipeline(sql as any),
      new ContainersPricingPipeline(sql as any),
      new ContainersRegistryPricingPipeline(sql as any),
      new DataAnalyticsPricingPipeline(sql as any),
      new NetworkingPricingPipeline(sql as any),
      new StoragePricingPipeline(sql as any),
      new AppHostingPricingPipeline(sql as any),
      new IntegrationPricingPipeline(sql as any),
      new SecurityPricingPipeline(sql as any),
      new AIPricingPipeline(sql as any),
      new TimeSeriesPricingPipeline(sql as any),
      new GraphDatabasePricingPipeline(sql as any),
      new SearchEnginePricingPipeline(sql as any),
      new InferenceEndpointsPricingPipeline(sql as any),
    ];

    for (const pipeline of pipelines) {
      await pipeline.run();
      console.log(`✅ Scheduled pipeline ${pipeline.constructor.name} completed.`);
    }

    // Prices just changed — drop cached API responses so users see fresh data
    // immediately instead of serving up to 10 more minutes of stale results.
    clearCache();

    console.log('✅ All Scheduled pipelines completed successfully.');
  } catch (err) {
    console.error('❌ Scheduled pipeline failed:', err);
  }
  // Staleness/data-quality email alerts are a hosted-edition feature (require
  // SMTP config and workload-coverage checks) — omitted from the community
  // edition. Self-hosters can monitor pricing_records.updated_at manually.
});

console.log('✅ Background worker registered cron jobs.');
