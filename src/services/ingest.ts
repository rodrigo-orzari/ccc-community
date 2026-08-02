import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import { PricingPipeline } from './pricing_pipeline';
import { DatabasePricingPipeline } from './database_pipeline';
import { ServerlessPricingPipeline } from './serverless_pipeline';
import { ContainersPricingPipeline } from './containers_pipeline';
import { ContainersRegistryPricingPipeline } from './containers_registry_pipeline';
import { DataAnalyticsPricingPipeline } from './data_analytics_pipeline';
import { NetworkingPricingPipeline } from './networking_pipeline';
import { StoragePricingPipeline } from './storage_pipeline';
import { AppHostingPricingPipeline } from './app_hosting_pipeline';
import { IntegrationPricingPipeline } from './integration_pipeline';
import { SecurityPricingPipeline } from './security_pipeline';
import { AIPricingPipeline, drainAIScrapeFailures } from './ai_pipeline';
import { TimeSeriesPricingPipeline } from './time_series_pipeline';
import { GraphDatabasePricingPipeline } from './graph_database_pipeline';
import { SearchEnginePricingPipeline } from './search_engine_pipeline';
import { InferenceEndpointsPricingPipeline } from './inference_endpoints_pipeline';
import { reconcileNormalizedCatalog, findUncoveredCategories } from './normalized_pricing.ts';

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // ✅ FIXED: Enable TLS certificate validation with CA support
  const ssl = process.env.DATABASE_CA_CERT
    ? {
        rejectUnauthorized: true,
        ca: Buffer.from(process.env.DATABASE_CA_CERT, 'base64'),
      }
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true } // Production: enforce validation, use built-in CAs
      : false; // Development: skip TLS validation only for local connections

  const sql = postgres(dbUrl, { ssl });

  try {
    console.log('🚀 Starting pricing data ingestion...\n');

    // Report the anchor-region scope up front. Every pipeline mirrors its
    // results into sku_catalog/regional_prices, but only for regions flagged
    // is_anchor — that is what keeps the normalized catalog from growing by
    // the full region count of each provider.
    const anchors = await sql`
      SELECT p.slug AS provider, r.slug AS region, r.geo_group
      FROM regions r
      JOIN providers p ON p.id = r.provider_id
      WHERE r.is_anchor = TRUE
      ORDER BY r.geo_group, p.slug
    `;
    if (anchors.length === 0) {
      console.warn('⚠️  No anchor regions configured. Run src/db/migrations/001_premium_normalized_pricing.sql');
      console.warn('   Falling back to projecting ALL regions into the normalized catalog.\n');
    } else {
      const byGroup = anchors.reduce((acc: Record<string, string[]>, a: any) => {
        (acc[a.geo_group ?? 'ungrouped'] ??= []).push(`${a.provider}:${a.region}`);
        return acc;
      }, {} as Record<string, string[]>);
      console.log(`⚓ Anchor regions (${anchors.length} across ${Object.keys(byGroup).length} geo groups):`);
      for (const [group, list] of Object.entries(byGroup)) {
        console.log(`   ${group}: ${(list as string[]).join(', ')}`);
      }
      console.log('');
    }

    // Run compute pricing pipeline
    console.log('📊 Computing VM Pricing...');
    const computePipeline = new PricingPipeline(sql as any);
    const computeResults = await computePipeline.run();
    computeResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} VMs`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Database Pricing...');
    // Run database pricing pipeline
    const dbPipeline = new DatabasePricingPipeline(sql as any);
    const dbResults = await dbPipeline.run();
    dbResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} DB configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Serverless Pricing...');
    // Run serverless pricing pipeline
    const serverlessPipeline = new ServerlessPricingPipeline(sql as any);
    const serverlessResults = await serverlessPipeline.run();
    serverlessResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} Serverless configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Containers Pricing...');
    // Run containers pricing pipeline
    const containersPipeline = new ContainersPricingPipeline(sql as any);
    const containersResults = await containersPipeline.run();
    containersResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} Containers configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Container Registry Pricing...');
    // Run container registry pricing pipeline
    const registryPipeline = new ContainersRegistryPricingPipeline(sql as any);
    const registryResults = await registryPipeline.run();
    registryResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} Registry configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Data Analytics Pricing...');
    // Run data analytics pricing pipeline
    const analyticsPipeline = new DataAnalyticsPricingPipeline(sql as any);
    const analyticsResults = await analyticsPipeline.run();
    analyticsResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} Data Analytics configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Networking Pricing...');
    // Run networking pricing pipeline
    const networkingPipeline = new NetworkingPricingPipeline(sql as any);
    const networkingResults = await networkingPipeline.run();
    networkingResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ NETWORKING: ${result.recordsProcessed} configurations inserted`);
      } else {
        console.log(`  ❌ NETWORKING: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Storage Pricing...');
    // Run storage pricing pipeline
    const storagePipeline = new StoragePricingPipeline(sql as any);
    const storageResults = await storagePipeline.run();
    storageResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} Storage configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing App Hosting Pricing...');
    // Run app hosting pricing pipeline
    const appHostingPipeline = new AppHostingPricingPipeline(sql as any);
    const appHostingResults = await appHostingPipeline.run();
    appHostingResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} App Hosting configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Integration Pricing...');
    // Run integration pricing pipeline
    const integrationPipeline = new IntegrationPricingPipeline(sql as any);
    const integrationResults = await integrationPipeline.run();
    integrationResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} Integration configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Security & Identity Pricing...');
    // Run security pricing pipeline
    const securityPipeline = new SecurityPricingPipeline(sql as any);
    const securityResults = await securityPipeline.run();
    securityResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ SECURITY: ${result.recordsProcessed} configurations inserted`);
      } else {
        console.log(`  ❌ SECURITY: ${result.message}`);
      }
    });

    console.log('\n📊 Computing AI Models Pricing...');
    // Run AI pricing pipeline
    const aiPipeline = new AIPricingPipeline(sql as any);
    const aiResults = await aiPipeline.run();
    aiResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ AI: ${result.count || 0} configurations inserted`);
      } else {
        console.log(`  ❌ AI: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Time-Series Database Pricing...');
    // Run time-series database pipeline
    const timeSeriesPipeline = new TimeSeriesPricingPipeline(sql as any);
    const timeSeriesResults = await timeSeriesPipeline.run();
    timeSeriesResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ TIME-SERIES: ${result.recordsProcessed} configurations inserted`);
      } else {
        console.log(`  ❌ TIME-SERIES: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Graph Database Pricing...');
    // Run graph database pipeline
    const graphPipeline = new GraphDatabasePricingPipeline(sql as any);
    const graphResults = await graphPipeline.run();
    graphResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ GRAPH: ${result.recordsProcessed} configurations inserted`);
      } else {
        console.log(`  ❌ GRAPH: ${result.message}`);
      }
    });

    console.log('\n📊 Computing Search Engine Pricing...');
    // Run search engine pipeline
    const searchPipeline = new SearchEnginePricingPipeline(sql as any);
    const searchResults = await searchPipeline.run();
    searchResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ SEARCH: ${result.recordsProcessed} configurations inserted`);
      } else {
        console.log(`  ❌ SEARCH: ${result.message}`);
      }
    });


    console.log('\n📊 Computing Inference Endpoints Pricing...');
    // Run inference endpoints pipeline
    const inferencePipeline = new InferenceEndpointsPricingPipeline(sql as any);
    const inferenceResults = await inferencePipeline.run();
    inferenceResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ INFERENCE: ${result.recordsProcessed} configurations inserted`);
      } else {
        console.log(`  ❌ INFERENCE: ${result.message}`);
      }
    });

    // Report scrapers that fell back to static config. Each one means a
    // provider's catalogue is being represented by a handful of hardcoded
    // entries instead of its real offering — a coverage gap that otherwise
    // only shows up as a warning buried thousands of lines earlier.
    const failures = drainAIScrapeFailures();
    if (failures.length > 0) {
      console.warn(`\n⚠️  ${failures.length} AI scraper(s) fell back to static config — catalogue is incomplete for:`);
      for (const f of failures) {
        console.warn(`   ${f.provider}: ${f.reason}`);
      }
      console.warn('   These providers show only their static fallback models on the site.');
    }

    // Reconcile the premium catalog before reporting totals.
    //
    // Seven pipelines (networking, security, time-series, graph, search,
    // certificate management, inference endpoints) write to pricing_records
    // directly instead of going through PricingPipeline.saveRecords(), so they
    // never trigger the normalized write. This sweep backfills whatever they
    // missed, and covers any future pipeline that does the same.
    console.log('\n🔄 Reconciling premium catalog...');
    const recon = await reconcileNormalizedCatalog(sql);
    if (recon.skusAdded > 0 || recon.pricesAdded > 0) {
      console.log(`   ↳ backfilled ${recon.skusAdded} SKUs / ${recon.pricesAdded} prices missed by non-standard pipelines`);
    } else {
      console.log('   ↳ already in sync — nothing to backfill');
    }

    // Split real gaps from structural ones. Consumption-priced categories
    // (no region, no vCPU — NAT gateways, VPN hours, certificates) can never
    // enter a region-keyed, spec-matched catalog, so warning about them every
    // run would just teach the reader to skip the message.
    const uncovered = await findUncoveredCategories(sql);
    const actionable = uncovered.filter((c: any) => c.actionable);
    const structural = uncovered.filter((c: any) => !c.actionable);

    if (actionable.length > 0) {
      console.warn('⚠️  Categories with spec-bearing rows MISSING from the premium catalog:');
      for (const row of actionable) {
        console.warn(`   ${row.category}: ${row.matchable_rows} matchable rows, 0 premium prices — investigate`);
      }
    }
    if (structural.length > 0) {
      const names = structural.map((c: any) => c.category).join(', ');
      const rows = structural.reduce((sum: number, c: any) => sum + c.pricing_rows, 0);
      console.log(`ℹ️  Consumption-priced categories not in premium catalog (expected): ${names} — ${rows} rows`);
    }

    const [normStats] = await sql`
      SELECT
        (SELECT count(*) FROM sku_catalog)     AS skus,
        (SELECT count(*) FROM regional_prices) AS prices
    `;
    console.log(`\n📦 Normalized catalog: ${normStats.skus} SKUs / ${normStats.prices} regional prices`);

    console.log('\n✅ All pipelines completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
