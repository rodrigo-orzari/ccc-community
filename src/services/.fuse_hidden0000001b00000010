import axios from 'axios';
import type { Sql } from 'postgres';
import { BaseAdapter, PricingRecord, PricingPipeline, fetchWithRetry, sleep, AZURE_RETAIL_API_PAGE_DELAY_MS, AZURE_RETAIL_API_REGION_DELAY_MS } from './pricing_pipeline';
import { DATABRICKS_INSTANCES, DATABRICKS_AWS_REGION, DATABRICKS_GCP_REGION } from '../config/databricks_instances';
import { SNOWFLAKE_INSTANCES, SNOWFLAKE_AWS_REGION, SNOWFLAKE_AZURE_REGION, SNOWFLAKE_GCP_REGION } from '../config/snowflake_instances';
import { NATIVE_ANALYTICS_INSTANCES, NATIVE_ANALYTICS_AWS_REGION, NATIVE_ANALYTICS_GCP_REGION } from '../config/native_analytics_instances';
import { ALIBABA_ANALYTICS_INSTANCES, ALIBABA_ANALYTICS_REGION, ALIBABA_ANALYTICS_GEOGRAPHY } from '../config/alibaba_data_analytics';
import { ORACLE_ANALYTICS_INSTANCES, ORACLE_ANALYTICS_REGION, ORACLE_ANALYTICS_GEOGRAPHY } from '../config/oracle_data_analytics';
import { DIGITALOCEAN_ANALYTICS_INSTANCES, DIGITALOCEAN_ANALYTICS_REGION, DIGITALOCEAN_ANALYTICS_GEOGRAPHY } from '../config/digitalocean_data_analytics';
import { ANALYTICS_REGIONS } from '../config/analytics_regions';

const STREAMING_ENGINES = new Set([
  'Kinesis Data Streams',
  'Pub/Sub',
  'Event Hubs',
  'ApsaraMQ for Kafka',
  'Kafka',
  // Oracle's streaming row was missing from this set, so it was filed as
  // 'data_warehouse' — making Oracle show N/A for streaming components even
  // though the row exists.
  'OCI Streaming',
]);

function analyticsCategory(engine: string): string {
  return STREAMING_ENGINES.has(engine) ? 'Streaming' : 'data_warehouse';
}

// Replicate each single-region analytics record across the provider's regions,
// scaling price by the per-region multiplier. Providers without a region table
// (or engines priced globally) fall through unchanged. See config/analytics_regions.ts.
function expandRecordsByRegion(records: PricingRecord[]): PricingRecord[] {
  return records.flatMap(rec => {
    const regions = ANALYTICS_REGIONS[rec.provider];
    if (!regions || regions.length === 0) return [rec];
    return regions.map(r => ({
      ...rec,
      region: r.region,
      geography: r.geography,
      price: Number((rec.price * r.mult).toFixed(6)),
    }));
  });
}

// ─── Databricks Static Adapters ────────────────────────────────────────────────

export class DatabricksStaticAdapter extends BaseAdapter {
  providerSlug: string;
  private instances: typeof DATABRICKS_INSTANCES;
  private region: string;

  constructor(provider: 'aws' | 'gcp') {
    super();
    this.providerSlug = provider;
    this.instances = DATABRICKS_INSTANCES.filter(i => i.provider === provider);
    this.region = provider === 'aws' ? DATABRICKS_AWS_REGION : DATABRICKS_GCP_REGION;
  }

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Databricks pricing for ${this.providerSlug.toUpperCase()} (static config)...`);
    return this.instances.map(inst => ({
      provider: this.providerSlug,
      service: 'Databricks',
      region: this.region,
      instanceType: `${inst.tier} ${inst.computeType}`,
      vcpus: 1, // Represents 1 DBU
      memoryGb: 0,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: 'N. America',
      category: 'data_warehouse',
      price: inst.pricePerDbu,
      unit: 'DBU',
      attributes: {
        engine: 'Databricks',
        tier: inst.tier,
        deployment_type: inst.deploymentType,
      },
      dataSource: 'static_config' as const,
    }));
  }
}

// ─── Snowflake Static Adapters ─────────────────────────────────────────────────

export class SnowflakeStaticAdapter extends BaseAdapter {
  providerSlug: string;
  private instances: typeof SNOWFLAKE_INSTANCES;
  private region: string;

  constructor(provider: 'aws' | 'azure' | 'gcp') {
    super();
    this.providerSlug = provider;
    this.instances = SNOWFLAKE_INSTANCES.filter(i => i.provider === provider);
    if (provider === 'aws') this.region = SNOWFLAKE_AWS_REGION;
    else if (provider === 'azure') this.region = SNOWFLAKE_AZURE_REGION;
    else this.region = SNOWFLAKE_GCP_REGION;
  }

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Snowflake pricing for ${this.providerSlug.toUpperCase()} (static config)...`);
    return this.instances.map(inst => ({
      provider: this.providerSlug,
      service: 'Snowflake',
      region: this.region,
      instanceType: `Snowflake ${inst.tier}`,
      vcpus: 1, // Represents 1 Credit
      memoryGb: 0,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: 'N. America',
      category: 'data_warehouse',
      price: inst.pricePerCredit,
      unit: 'Credit',
      attributes: {
        engine: 'Snowflake',
        tier: inst.tier,
        deployment_type: inst.deploymentType,
      },
      dataSource: 'static_config' as const,
    }));
  }
}

// ─── Databricks Azure Adapter (Live API) ───────────────────────────────────────

export class DatabricksAzureAdapter extends BaseAdapter {
  providerSlug = 'azure';
  // See AzureAdapter.REGIONS in pricing_pipeline.ts for why westus2 is added
  // alongside eastus (older westus prices 15-25% above eastus; westus2 is
  // the modern, closely-priced West region).
  private static readonly REGIONS = ['eastus', 'westus2'];

  async fetchPricing(): Promise<PricingRecord[]> {
    const records: PricingRecord[] = [];
    for (const [i, region] of DatabricksAzureAdapter.REGIONS.entries()) {
      try {
        records.push(...(await this.fetchForRegion(region)));
      } catch (err: any) {
        console.warn(`⚠️  Azure Databricks pricing fetch failed for ${region} (${err.message}) — keeping results from other regions.`);
      }
      if (i < DatabricksAzureAdapter.REGIONS.length - 1) await sleep(AZURE_RETAIL_API_REGION_DELAY_MS);
    }
    console.log(`✅ Fetched ${records.length} Azure Databricks records across ${DatabricksAzureAdapter.REGIONS.length} regions (some regions may have failed — see warnings above)`);
    return records;
  }

  private async fetchForRegion(region: string): Promise<PricingRecord[]> {
    console.log(`Fetching Azure Databricks pricing (${region})...`);
    const filter = encodeURIComponent(
      `serviceName eq 'Azure Databricks' and priceType eq 'Consumption' and armRegionName eq '${region}'`
    );
    let url: string | null = `https://prices.azure.com/api/retail/prices?$filter=${filter}`;
    const allItems: any[] = [];

    let pages = 0;
    while (url && pages < 10) {
      const response = await fetchWithRetry(url, { timeout: 30000 });
      allItems.push(...(response.data.Items ?? []));
      url = response.data.NextPageLink ?? null;
      pages++;
      if (url) await sleep(AZURE_RETAIL_API_PAGE_DELAY_MS);
    }

    const records: PricingRecord[] = [];
    const seen = new Set<string>();

    for (const item of allItems) {
      if (!item.retailPrice || item.retailPrice <= 0) continue;

      // SKU Name often looks like "Standard Jobs Light Compute" or "Premium All-purpose Compute"
      const skuName: string = (item.skuName ?? '').trim();
      if (!skuName) continue;

      // Extract Tier
      let tier = 'Standard';
      if (skuName.toLowerCase().includes('premium')) tier = 'Premium';
      else if (skuName.toLowerCase().includes('enterprise')) tier = 'Enterprise';

      // Extract Deployment Type
      const deploymentType = skuName.toLowerCase().includes('serverless') ? 'Serverless' : 'Provisioned';

      const dedupeKey = skuName;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      records.push({
        provider: 'azure',
        service: 'Azure Databricks',
        region,
        instanceType: skuName,
        vcpus: 1, // Represents 1 DBU
        memoryGb: 0,
        arch: 'x86 64',
        os: 'Linux',
        cpuVendor: 'N/A',
        gpuCount: 0,
        geography: this.getGeography(region),
        category: 'data_warehouse',
        price: item.retailPrice,
        unit: 'DBU',
        attributes: {
          engine: 'Databricks',
          tier,
          deployment_type: deploymentType,
        },
        dataSource: 'live_api' as const,
      });
    }

    return records;
  }
}

// ─── Native Analytics Static Adapter (Redshift, BigQuery) ──────────────────────

export class NativeAnalyticsStaticAdapter extends BaseAdapter {
  providerSlug: string;
  private instances: typeof NATIVE_ANALYTICS_INSTANCES;
  private region: string;

  constructor(provider: 'aws' | 'gcp' | 'azure') {
    super();
    this.providerSlug = provider;
    this.instances = NATIVE_ANALYTICS_INSTANCES.filter(i => i.provider === provider);
    this.region = provider === 'aws' ? NATIVE_ANALYTICS_AWS_REGION : provider === 'gcp' ? NATIVE_ANALYTICS_GCP_REGION : 'eastus';
  }

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Native Analytics pricing for ${this.providerSlug.toUpperCase()} (static config)...`);
    return this.instances.map(inst => ({
      provider: this.providerSlug,
      service: inst.engine,
      region: this.region,
      instanceType: `${inst.engine} ${inst.tier} (${inst.deploymentType})`,
      vcpus: 1, // Normalized Compute Unit (1 RPU, 1 Node, or 100 Slots)
      memoryGb: 0,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: this.getGeography(this.region),
      category: analyticsCategory(inst.engine),
      price: inst.pricePerNormalizedUnit,
      unit: inst.computeUnitName,
      attributes: {
        engine: inst.engine,
        tier: inst.tier,
        deployment_type: inst.deploymentType,
      },
      dataSource: 'static_config' as const,
    }));
  }
}

// ─── Azure Synapse Adapter (Live API) ──────────────────────────────────────────

export class SynapseAzureAdapter extends BaseAdapter {
  providerSlug = 'azure';
  // See AzureAdapter.REGIONS in pricing_pipeline.ts for why westus2 is added
  // alongside eastus.
  private static readonly REGIONS = ['eastus', 'westus2'];

  async fetchPricing(): Promise<PricingRecord[]> {
    const records: PricingRecord[] = [];
    for (const [i, region] of SynapseAzureAdapter.REGIONS.entries()) {
      try {
        records.push(...(await this.fetchForRegion(region)));
      } catch (err: any) {
        console.warn(`⚠️  Azure Synapse pricing fetch failed for ${region} (${err.message}) — keeping results from other regions.`);
      }
      if (i < SynapseAzureAdapter.REGIONS.length - 1) await sleep(AZURE_RETAIL_API_REGION_DELAY_MS);
    }
    console.log(`✅ Fetched ${records.length} Azure Synapse records across ${SynapseAzureAdapter.REGIONS.length} regions (some regions may have failed — see warnings above)`);
    return records;
  }

  private async fetchForRegion(region: string): Promise<PricingRecord[]> {
    console.log(`Fetching Azure Synapse pricing (${region})...`);
    const filter = encodeURIComponent(
      `serviceName eq 'Azure Synapse Analytics' and priceType eq 'Consumption' and armRegionName eq '${region}'`
    );
    let url: string | null = `https://prices.azure.com/api/retail/prices?$filter=${filter}`;
    const allItems: any[] = [];

    let pages = 0;
    while (url && pages < 10) {
      const response = await fetchWithRetry(url, { timeout: 30000 });
      allItems.push(...(response.data.Items ?? []));
      url = response.data.NextPageLink ?? null;
      pages++;
      if (url) await sleep(AZURE_RETAIL_API_PAGE_DELAY_MS);
    }

    const records: PricingRecord[] = [];
    const seen = new Set<string>();

    for (const item of allItems) {
      if (!item.retailPrice || item.retailPrice <= 0) continue;

      const skuName: string = (item.skuName ?? '').trim();
      const productName: string = (item.productName ?? '').trim();
      if (!skuName || !productName) continue;

      // Filter for Dedicated SQL Pool (DWUs) and map to normalized units (1 Unit = 100 DWU)
      // Often skuName contains "DW100c", "DW500c"
      let tier = 'Standard';
      let price = item.retailPrice;

      if (!skuName.toLowerCase().includes('dw') && !productName.toLowerCase().includes('dw')) continue;

      const dedupeKey = skuName;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      records.push({
        provider: 'azure',
        service: 'Azure Synapse',
        region,
        instanceType: skuName,
        vcpus: 1, // Normalized to 1 Unit (equivalent to the DWU instance itself for simplicity in this demo, or we could parse DW100c to scale `vcpus`)
        memoryGb: 0,
        arch: 'x86 64',
        os: 'Linux',
        cpuVendor: 'N/A',
        gpuCount: 0,
        geography: this.getGeography(region),
        category: 'data_warehouse',
        price,
        unit: 'DWU Instance',
        attributes: {
          engine: 'Synapse',
          tier,
          deployment_type: 'Provisioned',
        },
        dataSource: 'live_api' as const,
      });
    }

    return records;
  }
}

// ─── Alibaba MaxCompute / E-MapReduce (static config) ─────────────────────────

export class AlibabaAnalyticsAdapter extends BaseAdapter {
  providerSlug = 'alibaba';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Alibaba Analytics pricing (${ALIBABA_ANALYTICS_INSTANCES.length} entries from static config)...`);
    return ALIBABA_ANALYTICS_INSTANCES.map(inst => ({
      provider: 'alibaba',
      service: inst.serviceName,
      region: ALIBABA_ANALYTICS_REGION,
      instanceType: `${inst.engine} ${inst.tier}`,
      vcpus: 1, // Normalized: 1 CU / 1 OCPU / 1 Instance-Hr
      memoryGb: 0,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: ALIBABA_ANALYTICS_GEOGRAPHY,
      category: analyticsCategory(inst.engine),
      price: inst.pricePerUnit,
      unit: inst.computeUnitName,
      attributes: {
        engine: inst.engine,
        tier: inst.tier,
        deployment_type: inst.deploymentType,
      },
      dataSource: 'static_config' as const,
    }));
  }
}

// ─── Oracle Analytics Cloud (static config) ────────────────────────────────────

export class OracleAnalyticsAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Oracle Analytics Cloud pricing (${ORACLE_ANALYTICS_INSTANCES.length} entries from static config)...`);
    return ORACLE_ANALYTICS_INSTANCES.map(inst => ({
      provider: 'oracle',
      service: inst.serviceName,
      region: ORACLE_ANALYTICS_REGION,
      instanceType: `${inst.engine} ${inst.tier}`,
      vcpus: 1, // Normalized: 1 OCPU / 1 ECPU
      memoryGb: 0,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: ORACLE_ANALYTICS_GEOGRAPHY,
      category: 'data_warehouse',
      price: inst.pricePerUnit,
      unit: inst.computeUnitName,
      attributes: {
        engine: inst.engine,
        tier: inst.tier,
        deployment_type: inst.deploymentType,
      },
      dataSource: 'static_config' as const,
    }));
  }
}

// ─── DigitalOcean Analytics (static config) ────────────────────────────────────

export class DigitalOceanAnalyticsAdapter extends BaseAdapter {
  providerSlug = 'digitalocean';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching DigitalOcean Analytics pricing (${DIGITALOCEAN_ANALYTICS_INSTANCES.length} entries from static config)...`);
    return DIGITALOCEAN_ANALYTICS_INSTANCES.map(inst => ({
      provider: 'digitalocean',
      service: inst.serviceName,
      region: DIGITALOCEAN_ANALYTICS_REGION,
      instanceType: `${inst.engine} ${inst.tier}`,
      vcpus: 1,
      memoryGb: 0,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: DIGITALOCEAN_ANALYTICS_GEOGRAPHY,
      category: analyticsCategory(inst.engine),
      price: inst.pricePerUnit,
      unit: inst.computeUnitName,
      attributes: {
        engine: inst.engine,
        tier: inst.tier,
        deployment_type: inst.deploymentType,
      },
      dataSource: 'static_config' as const,
    }));
  }
}

// ─── Data Analytics Pricing Pipeline ───────────────────────────────────────────

export class DataAnalyticsPricingPipeline extends PricingPipeline {
  constructor(sql: Sql) {
    super(sql);
    // Overwrite the base adapters with our data analytics adapters
    this.adapters = [
      new DatabricksStaticAdapter('aws'),
      new DatabricksStaticAdapter('gcp'),
      new SnowflakeStaticAdapter('aws'),
      new SnowflakeStaticAdapter('azure'),
      new SnowflakeStaticAdapter('gcp'),
      new DatabricksAzureAdapter(),
      new NativeAnalyticsStaticAdapter('aws'),
      new NativeAnalyticsStaticAdapter('gcp'),
      new NativeAnalyticsStaticAdapter('azure'),
      new SynapseAzureAdapter(),
      new AlibabaAnalyticsAdapter(),
      new OracleAnalyticsAdapter(),
      new DigitalOceanAnalyticsAdapter(),
    ];
  }

  async run(): Promise<{ provider: string; status: string; count?: number; message?: string }[]> {
    const results = [];
    console.log('🚀 Starting Data Analytics Pricing Pipeline...');
    
    // We will accumulate all records and then save them using the base class `saveRecords` method,
    // but we will do it PER provider to maintain the existing drift logic per provider/service.
    //
    // IMPORTANT: `saveRecords` files an ENTIRE batch under `records[0].service` (it ensures a
    // single service row per call). Some adapters emit MULTIPLE services in one batch — e.g.
    // Alibaba returns MaxCompute + E-MapReduce + Hologres + AnalyticDB, Oracle returns OAC +
    // Autonomous Data Warehouse, DigitalOcean returns OpenSearch + Kafka. So we must group each
    // adapter's records by `service` and call `saveRecords` once per service, otherwise every SKU
    // collapses under the first service name (and per-service deletes/drift break).

    for (const adapter of this.adapters) {
      try {
        const rawRecords = await adapter.fetchPricing();

        // Expand single-region records across the provider's regions so the
        // category has real geographic coverage (W. Europe, Asia Pacific,
        // etc.) — but ONLY for adapters that fetched a single region to begin
        // with (the static config adapters). DatabricksAzureAdapter and
        // SynapseAzureAdapter already live-fetch real eastus + westus2 prices;
        // running their output through this synthetic expansion overwrote
        // that real per-region data with the same synthetic region list
        // regardless of source, making a SKU priced in both eastus and
        // westus2 collapse into two identical-key rows per synthetic region —
        // exactly the "23505 duplicate key" collisions this category was
        // hitting (and silently dropping half of, post-dedup).
        const distinctRegions = new Set(rawRecords.map(r => r.region));
        const records = distinctRegions.size > 1 ? rawRecords : expandRecordsByRegion(rawRecords);

        const byService = new Map<string, PricingRecord[]>();
        for (const rec of records) {
          const group = byService.get(rec.service) ?? [];
          group.push(rec);
          byService.set(rec.service, group);
        }

        for (const group of byService.values()) {
          await this.saveRecords(group, 'data_warehouse');
        }
        results.push({ provider: adapter.providerSlug, status: 'success', count: records.length });
      } catch (error: any) {
        console.error(`❌ Error running ${adapter.providerSlug} adapter:`, error);
        results.push({ provider: adapter.providerSlug, status: 'error', message: error.message });
      }
    }
    
    console.log('✅ Data Analytics Pricing Pipeline Completed.');
    return results;
  }
}
