import axios from 'axios';
import type { Sql } from 'postgres';
import { BaseAdapter, PricingRecord, PricingPipeline, fetchWithRetry, sleep, AZURE_RETAIL_API_PAGE_DELAY_MS, AZURE_RETAIL_API_REGION_DELAY_MS } from './pricing_pipeline';
import { fetchOracleCatalog, findPrice, nameIncludes } from './oracle_price_list';
import {
  GCP_CLOUD_SQL_INSTANCES,
  GCP_CLOUD_SQL_REGION,
  GCP_CLOUD_SQL_GEOGRAPHY,
  ORACLE_AUTONOMOUS_INSTANCES,
  ORACLE_AUTONOMOUS_REGION,
  ORACLE_AUTONOMOUS_GEOGRAPHY,
  ORACLE_MYSQL_HEATWAVE_INSTANCES,
  ORACLE_MYSQL_HEATWAVE_REGION,
  ORACLE_MYSQL_HEATWAVE_GEOGRAPHY,
  ORACLE_POSTGRESQL_INSTANCES,
  ORACLE_POSTGRESQL_REGION,
  ORACLE_POSTGRESQL_GEOGRAPHY,
  DIGITALOCEAN_DB_INSTANCES,
  DIGITALOCEAN_DB_REGION,
  DIGITALOCEAN_DB_GEOGRAPHY,
} from '../config/database_instances';
import {
  ALIBABA_DB_INSTANCES,
  ALIBABA_DB_REGION,
  ALIBABA_DB_GEOGRAPHY,
} from '../config/alibaba_database_instances.ts';

// ─── Tier derivation ──────────────────────────────────────────────────────────
// Maps provider + instanceType → a human-readable performance-tier label that
// mirrors the VM category system (General Purpose, Memory Optimized, etc.).
// Stored in attributes.tier so no schema change is required.

// Azure Redis cache-size lookup — SKU names encode tier+number (e.g. "C1", "P2",
// "E20") rather than a literal GB figure, so memory_gb can't be parsed numerically
// like compute SKUs. Sizes are approximate, sourced from Azure Cache for Redis docs.
const AZURE_REDIS_CACHE_GB: Record<string, number> = {
  C0: 0.25, C1: 1, C2: 2.5, C3: 6, C4: 13, C5: 26, C6: 53,
  P1: 6, P2: 13, P3: 26, P4: 53, P5: 120,
};

function deriveRedisMemoryGb(sku: string): number {
  // Azure Redis SKUs delimit segments with underscores (e.g. "..._C1_Cache"),
  // and underscore counts as a \w character so \b boundaries don't apply here.
  const tierMatch = sku.match(/(?:^|_)([CP]\d+)(?:_|$)/i);
  if (tierMatch) {
    const key = tierMatch[1].toUpperCase();
    if (AZURE_REDIS_CACHE_GB[key] !== undefined) return AZURE_REDIS_CACHE_GB[key];
  }
  // Enterprise/Enterprise Flash SKUs (E10, E20, F300, F700...) encode capacity
  // directly in the trailing number — close enough as an approximate GB figure.
  const enterpriseMatch = sku.match(/(?:^|_)[EF](\d+)(?:_|$)/i);
  if (enterpriseMatch) return parseInt(enterpriseMatch[1]);
  return 0;
}

// Azure SQL/MySQL/PostgreSQL vCore SKUs never report memory in the Retail Prices
// API — only the SKU's vCPU count. Approximate GB/vCore by tier so memory-based
// workload matching (minMemoryGb) doesn't silently exclude every Azure relational row.
// Azure DB SKU names encode vCPU count in several inconsistent shapes
// ("..._64_vCore", "20 vCore", "Standard_D32ds_v5", "SQLMI_GP_Compute_Gen5_4").
// Try each known shape in order; SKUs with no countable vcpu (e.g. "Basic") return 0.
function parseAzureDbVcpus(sku: string): number {
  let m = sku.match(/(\d+)_?\s*vCore/i);
  if (m) return parseInt(m[1]);
  m = sku.match(/Gen\d+_(\d+)$/i);
  if (m) return parseInt(m[1]);
  m = sku.match(/[A-Z](\d+)[a-z]*_v\d+/i);
  if (m) return parseInt(m[1]);
  m = sku.match(/_(\d+)$/);
  if (m) return parseInt(m[1]);
  return 0;
}

function deriveAzureDbMemoryGb(tier: string, vcpus: number): number {
  if (!vcpus) return 0;
  const gbPerVcpu = tier === 'Memory Optimized' || tier === 'Business Critical' ? 8
    : tier === 'Burstable' ? 2
    : 5; // General Purpose / Standard / default
  return vcpus * gbPerVcpu;
}

function deriveTier(provider: string, instanceType: string): string {
  const t = instanceType.toLowerCase();

  if (provider === 'azure') {
    if (t.startsWith('gp_s_') || t.includes('serverless')) return 'General Purpose (Serverless)';
    if (t.startsWith('gp_') || t.startsWith('generalpurpose_')) return 'General Purpose';
    if (t.startsWith('mo_') || t.startsWith('memoryoptimized_')) return 'Memory Optimized';
    if (t.startsWith('bc_') || t.startsWith('businesscritical_')) return 'Business Critical';
    if (t.startsWith('b_') || t.startsWith('burstable_')) return 'Burstable';
    if (t.startsWith('hyperscale_') || t.includes('hyperscale')) return 'Hyperscale';
    if (t.startsWith('premium_') || /^p\d/.test(t)) return 'Premium';
    if (t.startsWith('standard_') || /^s\d/.test(t)) return 'Standard';
    if (t.startsWith('basic_') || /^b\d/.test(t)) return 'Basic';
    if (/^c\d/.test(t)) return 'Standard';  // Redis C-series
    return 'General Purpose';
  }

  if (provider === 'aws') {
    // db.t3.medium → Burstable, db.r5.large → Memory Optimized, db.m5.xlarge → General Purpose
    if (t.startsWith('db.t')) return 'Burstable';
    if (t.startsWith('db.r') || t.startsWith('db.x') || t.startsWith('db.z')) return 'Memory Optimized';
    if (t.startsWith('db.m')) return 'General Purpose';
    if (t.startsWith('db.c')) return 'Compute Optimized';
    return 'General Purpose';
  }

  if (provider === 'gcp') {
    if (t === 'db-f1-micro' || t === 'db-g1-small') return 'Shared Core';
    if (t.includes('highmem')) return 'Memory Optimized';
    return 'General Purpose';
  }

  if (provider === 'oracle') {
    if (t.startsWith('atp-') || t.startsWith('adw-')) return 'Serverless';
    return 'General Purpose';
  }

  if (provider === 'alibaba') {
    return 'General Purpose';
  }

  return 'General Purpose'; // DigitalOcean and any future providers
}

// ─── GCP Cloud SQL (static config) ────────────────────────────────────────────

export class GCPCloudSQLAdapter extends BaseAdapter {
  providerSlug = 'gcp';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching GCP Cloud SQL pricing (${GCP_CLOUD_SQL_INSTANCES.length} entries from static config)...`);
    return GCP_CLOUD_SQL_INSTANCES.map(inst => ({
      provider: 'gcp',
      service: 'Cloud SQL',
      region: GCP_CLOUD_SQL_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: GCP_CLOUD_SQL_GEOGRAPHY,
      category: 'Relational',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: inst.engine,
        engine_version: inst.engine === 'PostgreSQL' ? '15' : inst.engine === 'MySQL' ? '8.0' : '2022',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'SSD',
        tier: deriveTier('gcp', inst.type),
      },
    }));
  }
}

// ─── Oracle Autonomous Database (live OCI price list, static fallback) ─────────

// The OCI price list (oracle_price_list.ts) has an exact, unambiguous match
// for both workloads under Oracle's current "Autonomous AI" naming — verified
// to equal the existing static $0.336/ECPU-hr exactly, so this is a like-for-like
// swap to a self-updating source, not a guess.
const ORACLE_AUTONOMOUS_LIVE_NAMES: Record<string, string> = {
  ATP: 'oracle autonomous ai transaction processing - ecpu',
  ADW: 'oracle autonomous ai lakehouse - ecpu',
};

export class OracleAutonomousAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    let liveRates = new Map<string, number>();
    try {
      const catalog = await fetchOracleCatalog();
      for (const [workload, exactName] of Object.entries(ORACLE_AUTONOMOUS_LIVE_NAMES)) {
        // Substring match, not exact equality — Oracle's own price-list feed has
        // confirmed whitespace/formatting inconsistencies between rows for what's
        // conceptually the same line item (see oracle_genai_api.ts, 2026-07-29),
        // and an exact `===` would silently stop matching the moment that happens
        // here too, with no error, just a quiet drop back to static config.
        const rate = findPrice(catalog, item => nameIncludes(item, exactName));
        if (rate != null) liveRates.set(workload, rate);
      }
    } catch (err: any) {
      console.warn(`⚠️  OCI live price list fetch failed for Autonomous DB (${err.message}), using static config.`);
    }

    console.log(`Fetching Oracle Autonomous DB pricing (${liveRates.size}/${ORACLE_AUTONOMOUS_INSTANCES.length} from live OCI rates)...`);
    return ORACLE_AUTONOMOUS_INSTANCES.map(inst => {
      const liveRate = liveRates.get(inst.workload);
      return {
        provider: 'oracle',
        service: 'Autonomous Database',
        region: ORACLE_AUTONOMOUS_REGION,
        instanceType: inst.type,
        vcpus: 0,
        memoryGb: 0,
        arch: 'x86 64',
        os: '',
        cpuVendor: 'Intel',
        gpuCount: 0,
        geography: ORACLE_AUTONOMOUS_GEOGRAPHY,
        category: 'Relational',
        price: liveRate ?? inst.price,
        unit: 'ECPU-Hour',
        dataSource: (liveRate != null ? 'live_api' : 'static_config') as 'live_api' | 'static_config',
        attributes: {
          engine: 'Oracle DB',
          engine_version: '19c',
          deployment_type: 'Serverless',
          ha_mode: 'Multi AZ',
          storage_type: 'SSD',
          workload: inst.workload,
          tier: deriveTier('oracle', inst.type),
        },
      };
    });
  }
}

// ─── Oracle MySQL HeatWave (static config) ────────────────────────────────────

// Not wired to the live OCI price list: the feed's plain "MySQL Database -
// ECPU" SKU ($0.0366/ECPU-hr) prices roughly 5x below our static HeatWave
// estimate, and a separate "Database - MySQL HeatWave on AWS" category also
// exists — it's unclear whether "MySQL Database - ECPU" is base MySQL
// (without the HeatWave analytics engine) or HeatWave itself, and mapping the
// wrong one would silently under-price this row. Needs the exact HeatWave SKU
// confirmed against oracle.com before wiring live.
export class OracleMySQLHeatWaveAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Oracle MySQL HeatWave pricing (${ORACLE_MYSQL_HEATWAVE_INSTANCES.length} entries from static config)...`);
    return ORACLE_MYSQL_HEATWAVE_INSTANCES.map(inst => ({
      provider: 'oracle',
      service: 'MySQL HeatWave',
      region: ORACLE_MYSQL_HEATWAVE_REGION,
      instanceType: inst.type,
      vcpus: inst.ecpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: ORACLE_MYSQL_HEATWAVE_GEOGRAPHY,
      category: 'Relational',
      price: inst.price,
      unit: 'ECPU-Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'MySQL',
        engine_version: '9.x',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'SSD',
        tier: deriveTier('oracle', inst.type),
      },
    }));
  }
}

// ─── Oracle PostgreSQL (static config) ───────────────────────────────────────

// Not wired to the live OCI price list: our static price already bundles an
// estimated managed-service fee on top of raw compute (see comment on
// ORACLE_POSTGRESQL_INSTANCES), while the feed's "Database with PostgreSQL -
// X86" SKU ($0.098/OCPU-hr) may be base compute only. Swapping in the raw
// live rate could silently *remove* that markup and under-price this row.
// Needs the fee structure confirmed against oracle.com before wiring live.
export class OraclePostgreSQLAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Oracle PostgreSQL pricing (${ORACLE_POSTGRESQL_INSTANCES.length} entries from static config)...`);
    return ORACLE_POSTGRESQL_INSTANCES.map(inst => ({
      provider: 'oracle',
      service: 'OCI Database with PostgreSQL',
      region: ORACLE_POSTGRESQL_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'AMD',
      gpuCount: 0,
      geography: ORACLE_POSTGRESQL_GEOGRAPHY,
      category: 'Relational',
      price: inst.price,
      unit: 'ECPU-Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'PostgreSQL',
        engine_version: '14.x',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'SSD',
        tier: deriveTier('oracle', inst.type),
      },
    }));
  }
}

// ─── Vector Databases (static config) ────────────────────────────────────────

import { VECTOR_DATABASES } from '../config/vector_databases';

export class VectorDatabasesAdapter extends BaseAdapter {
  providerSlug = 'vector';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Vector DB pricing (${VECTOR_DATABASES.length} entries from static config)...`);
    return VECTOR_DATABASES.map(inst => ({
      provider: inst.provider,
      service: 'Vector Database',
      region: 'global',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory_gb,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: 'Global',
      category: 'Vector',
      price: inst.price,
      unit: inst.unit,
      dataSource: 'static_config' as const,
      attributes: inst.attributes,
    }));
  }
}

// ─── AWS RDS (live API) ────────────────────────────────────────────────────────

const RDS_ENGINE_MAP: Record<string, string> = {
  'MySQL':                  'MySQL',
  'PostgreSQL':             'PostgreSQL',
  'MariaDB':                'MariaDB',
  'Aurora MySQL':           'MySQL',
  'Aurora PostgreSQL':      'PostgreSQL',
  'SQL Server':             'SQL Server',
  'SQL Server SE':          'SQL Server',
  'SQL Server EE':          'SQL Server',
  'SQL Server Web':         'SQL Server',
  'SQL Server Ex':          'SQL Server',
  'Oracle':                 'Oracle DB',
  'Oracle SE2':             'Oracle DB',
  'Oracle EE':              'Oracle DB',
  'Db2':                    'Db2',
  'IBM Db2':                'Db2',
};

export class AWSRDSAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log('Fetching AWS RDS pricing (us-east-1)...');
    const url = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/us-east-1/index.json';
    const response = await axios.get(url, { timeout: 60000 });
    const products = response.data.products;
    const terms = response.data.terms?.OnDemand ?? {};

    // Deduplicate by (instanceType, engine, haMode) — the AWS pricing API
    // lists every engine version separately (PostgreSQL 14, 15, 16…) but prices
    // are identical across versions for the same instance. We keep whichever
    // version is encountered last (typically the highest/latest).
    const best = new Map<string, PricingRecord>();

    for (const sku of Object.keys(products)) {
      const product = products[sku];
      if (product.productFamily !== 'Database Instance') continue;

      const attr = product.attributes;
      // Skip Windows SQL Server / Oracle licensing noise — keep Linux baseline
      if (attr.operatingSystem && attr.operatingSystem !== 'Linux') continue;
      if (attr.licenseModel && attr.licenseModel.toLowerCase().includes('bring your own license')) continue;

      const term = terms[sku];
      if (!term) continue;

      const offerKey = Object.keys(term)[0];
      const priceDimKey = Object.keys(term[offerKey].priceDimensions)[0];
      const priceDim = term[offerKey].priceDimensions[priceDimKey];
      const price = parseFloat(priceDim.pricePerUnit?.USD ?? '0');
      if (isNaN(price) || price <= 0) continue;

      const instanceType = attr.instanceType ?? '';
      if (!instanceType.startsWith('db.')) continue;

      const vcpus = parseInt(attr.vcpu) || 0;
      const memoryGb = attr.memory ? parseFloat(attr.memory.replace(/[^0-9.]/g, '')) : 0;
      const deploymentOption = attr.deploymentOption ?? 'Single-AZ';
      const haMode = deploymentOption.includes('Multi') ? 'Multi AZ' : 'Single AZ';
      const rawEngine = attr.databaseEngine ?? '';
      const engine = RDS_ENGINE_MAP[rawEngine] ?? rawEngine;

      const dedupeKey = `${instanceType}::${engine}::${haMode}`;
      best.set(dedupeKey, {
        provider: 'aws',
        service: 'RDS',
        region: attr.regionCode || 'us-east-1',
        instanceType,
        vcpus,
        memoryGb,
        arch: 'x86 64',
        os: '',
        cpuVendor: this.getCpuVendor(instanceType),
        gpuCount: 0,
        geography: this.getGeography(attr.regionCode || 'us-east-1'),
        category: 'Relational',
        price,
        unit: priceDim.unit ?? 'Hrs',
        dataSource: 'live_api' as const,
        attributes: {
          engine,
          engine_version: attr.engineVersion ?? '',
          deployment_type: 'Provisioned',
          ha_mode: haMode,
          storage_type: 'SSD',
          tier: deriveTier('aws', instanceType),
        },
      });
    }

    const records = [...best.values()];
    console.log(`✅ Fetched ${records.length} AWS RDS records (deduplicated)`);
    return records;
  }
}

// ─── Azure Databases (live API) ────────────────────────────────────────────────

// Azure service names → our engine label
const AZURE_DB_SERVICES: { serviceName: string; engine: string }[] = [
  { serviceName: 'SQL Database',                         engine: 'SQL Server'  },
  { serviceName: 'SQL Managed Instance',                 engine: 'SQL Server'  },
  { serviceName: 'Azure Database for PostgreSQL',        engine: 'PostgreSQL'  },
  { serviceName: 'Azure Database for MySQL',             engine: 'MySQL'       },
  { serviceName: 'Azure Database for MariaDB',           engine: 'MariaDB'     },
  { serviceName: 'Azure Cosmos DB',                      engine: 'Cosmos DB'   },
  { serviceName: 'Redis Cache',                          engine: 'Redis'       },
];

function buildAzureDbFilter(): string {
  const clauses = AZURE_DB_SERVICES.map(s => `serviceName eq '${s.serviceName}'`);
  return clauses.join(' or ');
}

export class AzureDBAdapter extends BaseAdapter {
  providerSlug = 'azure';

  // Fetch Azure DB pricing scoped to a small set of representative regions
  // rather than duplicating every SKU across all ~60 Azure regions. eastus
  // stays the primary reference region; westus2 is added because Azure's
  // older westus region prices 15-25% above eastus and a single eastus
  // reference was silently standing in for all of "N. America" (westus2 is
  // the modern, closely-priced West region — see the comment on
  // AzureAdapter.REGIONS in pricing_pipeline.ts for the full reasoning).
  private static readonly REGIONS = ['eastus', 'westus2'];

  async fetchPricing(): Promise<PricingRecord[]> {
    const records: PricingRecord[] = [];

    for (const [i, region] of AzureDBAdapter.REGIONS.entries()) {
      try {
        records.push(...(await this.fetchForRegion(region)));
      } catch (err: any) {
        // Azure Retail Prices API rate-limits aggressively (few requests/min) —
        // one region failing must not discard results from other regions.
        console.warn(`⚠️  Azure database pricing fetch failed for ${region} (${err.message}) — keeping results from other regions.`);
      }
      if (i < AzureDBAdapter.REGIONS.length - 1) await sleep(AZURE_RETAIL_API_REGION_DELAY_MS);
    }

    console.log(`✅ Fetched ${records.length} Azure database records across ${AzureDBAdapter.REGIONS.length} regions (some regions may have failed — see warnings above)`);
    return records;
  }

  private async fetchForRegion(region: string): Promise<PricingRecord[]> {
    console.log(`Fetching Azure database pricing (${region})...`);
    const filter = encodeURIComponent(
      `(${buildAzureDbFilter()}) and priceType eq 'Consumption' and armRegionName eq '${region}'`
    );
    let url: string | null = `https://prices.azure.com/api/retail/prices?$filter=${filter}`;
    const allItems: any[] = [];

    let pages = 0;
    while (url && pages < 20) {
      const response = await fetchWithRetry(url);
      allItems.push(...(response.data.Items ?? []));
      url = response.data.NextPageLink ?? null;
      pages++;
      if (url) await sleep(AZURE_RETAIL_API_PAGE_DELAY_MS);
    }

    const records: PricingRecord[] = [];
    // Deduplicate by SKU within this region's response (some services
    // return multiple meter rows for the same SKU, e.g. different billing
    // granularities). We keep the first (cheapest) occurrence.
    const seen = new Set<string>();

    for (const item of allItems) {
      if (!item.retailPrice || item.retailPrice <= 0) continue;

      // armSkuName is the machine-readable identifier; items without one are
      // storage / I/O / backup meters, not compute instances — skip them.
      const sku: string = (item.armSkuName ?? '').trim();
      if (!sku) continue;

      const serviceName: string = item.serviceName ?? '';
      const serviceEntry = AZURE_DB_SERVICES.find(s => s.serviceName === serviceName);
      if (!serviceEntry) continue;

      const engine = serviceEntry.engine;
      const skuLower = sku.toLowerCase();

      // Skip storage, I/O, backup and other non-compute meters by checking
      // the human-readable product/SKU name for disqualifying terms.
      const productName: string = (item.productName ?? '').toLowerCase();
      const skuNameHuman: string = (item.skuName ?? '').toLowerCase();
      const nonComputeKeywords = ['storage', 'backup', 'i/o', 'log', 'snapshot', 'replica', 'lrs', 'grs', 'zrs'];
      if (nonComputeKeywords.some(kw => productName.includes(kw) || skuNameHuman.includes(kw))) continue;

      // Cosmos DB: only include vCore-provisioned throughput — skip RU/s meters
      if (engine === 'Cosmos DB' && !skuLower.includes('vcores') && !skuLower.includes('autoscale') && !skuLower.includes('standard')) continue;

      // Redis: only include actual cache-size SKUs, skip bandwidth/operations meters
      if (engine === 'Redis' && !skuLower.includes('cache')) continue;

      // Deduplicate
      const key = `${serviceName}::${sku}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Derive HA mode from SKU/tier description
      let haMode = 'Single AZ';
      if (skuLower.includes('zone redundant') || skuLower.includes('geo-redundant')) {
        haMode = 'Zone Redundant';
      } else if (skuLower.includes('business critical') || skuLower.includes('premium')) {
        haMode = 'Multi AZ';
      }

      // Parse vCPU count from SKU (e.g. "GP_Gen5_4" → 4, "BC_Gen5_8" → 8,
      // "Standard_D32ds_v5" → 32 — see parseAzureDbVcpus for why a naive
      // trailing-number regex misreads v5/v6-generation SKUs).
      const vcpus = parseAzureDbVcpus(sku);

      const price = item.retailPrice;
      const unit = item.unitOfMeasure ?? '1 Hour';
      // A per-year unit is a term-commitment rate. This used to amortize it to
      // an hourly figure labelled "1 Hour (Reserved)" and store it — which is
      // off-policy (the site carries on-demand only) and, worse, arrives as a
      // plausible-looking hourly number that undercuts the genuine on-demand
      // row for the same SKU. Every consumer picks the cheapest match, so the
      // committed rate would win silently.
      //
      // The `priceType eq 'Consumption'` filter on the request (see
      // fetchForRegion) already excludes Azure reservations, so this is
      // currently unreachable — verified 2026-07-28: all 518 Azure database
      // rows in production carry unit "1 Hour" or "1 GB/Hour", none
      // "(Reserved)". It stays as a guard because widening that filter would
      // otherwise reintroduce the problem without any visible signal.
      if (unit.includes('Year')) {
        console.warn(`⚠️  Skipping term-priced Azure DB SKU ${sku} (unit "${unit}") — on-demand rates only.`);
        continue;
      }

      const tier = deriveTier('azure', sku);
      records.push({
        provider: 'azure',
        service: 'Azure Databases',
        region,
        instanceType: sku,
        vcpus,
        memoryGb: engine === 'Redis' ? deriveRedisMemoryGb(sku) : deriveAzureDbMemoryGb(tier, vcpus),
        arch: 'x86 64',
        os: '',
        cpuVendor: 'Intel',
        gpuCount: 0,
        geography: 'N. America',
        category: engine === 'Cosmos DB' ? 'NoSQL' : engine === 'Redis' ? 'In-memory' : 'Relational',
        price,
        unit,
        dataSource: 'live_api' as const,
        attributes: {
          engine,
          engine_version: '',
          deployment_type: 'Provisioned',
          ha_mode: haMode,
          storage_type: 'SSD',
          tier,
        },
      });
    }

    return records;
  }
}

// ─── DigitalOcean Managed Databases (static config) ───────────────────────────

export class DigitalOceanDBAdapter extends BaseAdapter {
  providerSlug = 'digitalocean';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching DigitalOcean DB pricing (${DIGITALOCEAN_DB_INSTANCES.length} entries from static config)...`);
    const NOSQL_ENGINES = new Set(['MongoDB']);
    const IN_MEMORY_ENGINES = new Set(['Valkey']);
    return DIGITALOCEAN_DB_INSTANCES.map(inst => ({
      provider: 'digitalocean',
      service: 'Managed Databases',
      region: DIGITALOCEAN_DB_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: DIGITALOCEAN_DB_GEOGRAPHY,
      category: NOSQL_ENGINES.has(inst.engine) ? 'NoSQL' : IN_MEMORY_ENGINES.has(inst.engine) ? 'In-memory' : 'Relational',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: inst.engine,
        engine_version: '',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'SSD',
        tier: deriveTier('digitalocean', inst.type),
      },
    }));
  }
}

// ─── Alibaba ApsaraDB (static config) ───────────────────────────

export class AlibabaDBAdapter extends BaseAdapter {
  providerSlug = 'alibaba';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Alibaba DB pricing (${ALIBABA_DB_INSTANCES.length} entries from static config)...`);
    return ALIBABA_DB_INSTANCES.map(inst => ({
      provider: 'alibaba',
      // MongoDB entries are ApsaraDB for MongoDB (NoSQL), the rest ApsaraDB RDS
      // (Relational) — the hardcoded 'Relational' previously made Alibaba show
      // N/A for every NoSQL workload component.
      service: inst.engine === 'MongoDB' ? 'ApsaraDB for MongoDB' : 'ApsaraDB RDS',
      region: ALIBABA_DB_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: ALIBABA_DB_GEOGRAPHY,
      category: inst.engine === 'MongoDB' ? 'NoSQL' : 'Relational',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: inst.engine,
        engine_version: '',
        deployment_type: 'Provisioned',
        ha_mode: 'Multi AZ',
        storage_type: 'SSD',
        tier: deriveTier('alibaba', inst.type),
      },
    }));
  }
}

// ─── AWS ElastiCache for Redis (static config) ─────────────────────────────────

const AWS_ELASTICACHE_INSTANCES = [
  { type: 'cache.t3.micro', vcpus: 2, memory: 0.5, price: 0.017 },
  { type: 'cache.t3.medium', vcpus: 2, memory: 3.09, price: 0.068 },
  { type: 'cache.m6g.large', vcpus: 2, memory: 6.38, price: 0.151 },
  { type: 'cache.m6g.xlarge', vcpus: 4, memory: 12.93, price: 0.302 },
  { type: 'cache.r6g.large', vcpus: 2, memory: 13.07, price: 0.193 },
  { type: 'cache.r6g.xlarge', vcpus: 4, memory: 26.32, price: 0.386 },
];

export class AWSElastiCacheAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching AWS ElastiCache pricing (${AWS_ELASTICACHE_INSTANCES.length} entries from static config)...`);
    return AWS_ELASTICACHE_INSTANCES.map(inst => ({
      provider: 'aws',
      service: 'ElastiCache',
      region: 'us-east-1',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: 'N. America',
      category: 'In-memory',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'Redis',
        engine_version: '7.0',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'Memory',
        tier: deriveTier('aws', inst.type),
      },
    }));
  }
}

// ─── GCP Memorystore for Redis (static config) ─────────────────────────────────

const GCP_MEMORYSTORE_INSTANCES = [
  { type: 'M1 (Basic, 1GB)', vcpus: 1, memory: 1, price: 0.049 },
  { type: 'M2 (Basic, 4GB)', vcpus: 1, memory: 4, price: 0.196 },
  { type: 'M3 (Basic, 5GB)', vcpus: 2, memory: 5, price: 0.245 },
  { type: 'M4 (Standard HA, 10GB)', vcpus: 4, memory: 10, price: 0.59 },
  { type: 'M5 (Standard HA, 35GB)', vcpus: 8, memory: 35, price: 2.065 },
];

export class GCPMemorystoreAdapter extends BaseAdapter {
  providerSlug = 'gcp';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching GCP Memorystore pricing (${GCP_MEMORYSTORE_INSTANCES.length} entries from static config)...`);
    return GCP_MEMORYSTORE_INSTANCES.map(inst => ({
      provider: 'gcp',
      service: 'Memorystore',
      region: 'us-central1',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: 'N. America',
      category: 'In-memory',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'Redis',
        engine_version: '7.0',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'Memory',
        tier: deriveTier('gcp', inst.type),
      },
    }));
  }
}

// ─── Oracle Cache with Redis (static config) ───────────────────────────────────

const ORACLE_REDIS_INSTANCES = [
  { type: '2 OCPU / 16GB', vcpus: 2, memory: 16, price: 0.184 },
  { type: '4 OCPU / 32GB', vcpus: 4, memory: 32, price: 0.368 },
  { type: '8 OCPU / 64GB', vcpus: 8, memory: 64, price: 0.736 },
];

export class OracleRedisAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Oracle Cache with Redis pricing (${ORACLE_REDIS_INSTANCES.length} entries from static config)...`);
    return ORACLE_REDIS_INSTANCES.map(inst => ({
      provider: 'oracle',
      service: 'Cache with Redis',
      region: 'us-ashburn-1',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: 'N. America',
      category: 'In-memory',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'Redis',
        engine_version: '7.0',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'Memory',
        tier: 'General Purpose',
      },
    }));
  }
}

// ─── Alibaba ApsaraDB for Redis (static config) ────────────────────────────────

const ALIBABA_REDIS_INSTANCES = [
  { type: 'redis.standard.2g', vcpus: 1, memory: 2, price: 0.085 },
  { type: 'redis.standard.8g', vcpus: 2, memory: 8, price: 0.34 },
  { type: 'redis.standard.32g', vcpus: 4, memory: 32, price: 1.36 },
];

export class AlibabaRedisAdapter extends BaseAdapter {
  providerSlug = 'alibaba';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Alibaba ApsaraDB for Redis pricing (${ALIBABA_REDIS_INSTANCES.length} entries from static config)...`);
    return ALIBABA_REDIS_INSTANCES.map(inst => ({
      provider: 'alibaba',
      service: 'ApsaraDB for Redis',
      region: 'cn-hangzhou',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: 'Asia Pacific',
      category: 'In-memory',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'Redis',
        engine_version: '7.0',
        deployment_type: 'Provisioned',
        ha_mode: 'Single AZ',
        storage_type: 'Memory',
        tier: 'General Purpose',
      },
    }));
  }
}

// ─── AWS DynamoDB (Static Provisioned Capacity) ─────────────────────────────────

const AWS_DYNAMODB_INSTANCES = [
  { type: 'On-Demand Pricing (Pay-Per-Request)', vcpus: 0, memory: 0, price: 0.0000012 }, // $1.25 per million WCUs
  { type: 'Provisioned - 100 WCU/RCU', vcpus: 0, memory: 0, price: 0.084 }, // per hour
  { type: 'Provisioned - 500 WCU/RCU', vcpus: 0, memory: 0, price: 0.420 },
  { type: 'Provisioned - 1000 WCU/RCU', vcpus: 0, memory: 0, price: 0.840 },
  { type: 'Provisioned - 5000 WCU/RCU', vcpus: 0, memory: 0, price: 4.200 },
];

export class AWSDynamoDBAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching AWS DynamoDB pricing (${AWS_DYNAMODB_INSTANCES.length} entries from static config)...`);
    return AWS_DYNAMODB_INSTANCES.map(inst => ({
      provider: 'aws',
      service: 'DynamoDB',
      region: 'us-east-1',
      instanceType: inst.type,
      vcpus: 0,
      memoryGb: 0,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: this.getGeography('us-east-1'),
      category: 'NoSQL',
      price: inst.price,
      unit: 'RCU/WCU-Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'DynamoDB',
        engine_version: 'v2',
        deployment_type: inst.type.includes('On-Demand') ? 'Serverless' : 'Provisioned',
        ha_mode: 'Multi AZ',
        storage_type: 'Managed',
        tier: 'General Purpose',
      },
    }));
  }
}

// ─── AWS DocumentDB (MongoDB-Compatible) ────────────────────────────────────────

const AWS_DOCUMENTDB_INSTANCES = [
  { type: 'db.t3.medium', vcpus: 2, memory: 1, price: 0.28 },
  { type: 'db.t3.large', vcpus: 2, memory: 2, price: 0.56 },
  { type: 'db.t3.xlarge', vcpus: 4, memory: 4, price: 1.12 },
  { type: 'db.r5.large', vcpus: 2, memory: 16, price: 0.76 },
  { type: 'db.r5.xlarge', vcpus: 4, memory: 32, price: 1.53 },
  { type: 'db.r5.2xlarge', vcpus: 8, memory: 64, price: 3.06 },
  { type: 'db.r5.4xlarge', vcpus: 16, memory: 128, price: 6.12 },
];

export class AWSDocumentDBAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching AWS DocumentDB pricing (${AWS_DOCUMENTDB_INSTANCES.length} entries from static config)...`);
    return AWS_DOCUMENTDB_INSTANCES.map(inst => ({
      provider: 'aws',
      service: 'DocumentDB',
      region: 'us-east-1',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'Intel',
      gpuCount: 0,
      geography: this.getGeography('us-east-1'),
      category: 'NoSQL',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'DocumentDB',
        engine_version: '5.0',
        deployment_type: 'Provisioned',
        ha_mode: 'Multi AZ',
        storage_type: 'SSD',
        tier: inst.vcpus <= 2 ? 'Burstable' : inst.vcpus <= 8 ? 'General Purpose' : 'Memory Optimized',
      },
    }));
  }
}

// ─── GCP Firestore / Datastore ────────────────────────────────────────────────

const GCP_FIRESTORE_INSTANCES = [
  { type: 'Pay-as-you-go (Reads/Writes)', vcpus: 0, memory: 0, price: 0.00000108 },
  { type: 'Provisioned - 100 Ops/s', vcpus: 0, memory: 0, price: 0.05 },
  { type: 'Provisioned - 500 Ops/s', vcpus: 0, memory: 0, price: 0.25 },
  { type: 'Provisioned - 1000 Ops/s', vcpus: 0, memory: 0, price: 0.50 },
];

export class GCPFirestoreAdapter extends BaseAdapter {
  providerSlug = 'gcp';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching GCP Firestore pricing (${GCP_FIRESTORE_INSTANCES.length} entries from static config)...`);
    return GCP_FIRESTORE_INSTANCES.map(inst => ({
      provider: 'gcp',
      service: 'Firestore',
      region: 'us-central1',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: this.getGeography('us-central1'),
      category: 'NoSQL',
      price: inst.price,
      unit: 'Operations-Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'Firestore',
        engine_version: 'v1',
        deployment_type: inst.type.includes('Pay-as-you-go') ? 'Serverless' : 'Provisioned',
        ha_mode: 'Multi AZ',
        storage_type: 'Managed',
        tier: 'General Purpose',
      },
    }));
  }
}

// ─── GCP Cloud Bigtable ───────────────────────────────────────────────────────

const GCP_BIGTABLE_INSTANCES = [
  { type: 'Standard Node (1 node)', vcpus: 4, memory: 16, price: 0.65 },
  { type: 'Standard Node (3 nodes)', vcpus: 12, memory: 48, price: 1.95 },
  { type: 'Standard Node (5 nodes)', vcpus: 20, memory: 80, price: 3.25 },
];

export class GCPBigtableAdapter extends BaseAdapter {
  providerSlug = 'gcp';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching GCP Bigtable pricing (${GCP_BIGTABLE_INSTANCES.length} entries from static config)...`);
    return GCP_BIGTABLE_INSTANCES.map(inst => ({
      provider: 'gcp',
      service: 'Cloud Bigtable',
      region: 'us-central1',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: this.getGeography('us-central1'),
      category: 'NoSQL',
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'Bigtable',
        engine_version: 'v1',
        deployment_type: 'Provisioned',
        ha_mode: 'Multi AZ',
        storage_type: 'SSD',
        tier: 'General Purpose',
      },
    }));
  }
}

// ─── Oracle NoSQL Database Cloud Service ──────────────────────────────────────

const ORACLE_NOSQL_INSTANCES = [
  { type: 'On-Demand Pricing (Pay-Per-Request)', vcpus: 0, memory: 0, price: 0.0000010 },
  { type: 'Provisioned - 100 WCU/RCU', vcpus: 0, memory: 0, price: 0.075 },
  { type: 'Provisioned - 500 WCU/RCU', vcpus: 0, memory: 0, price: 0.375 },
  { type: 'Provisioned - 1000 WCU/RCU', vcpus: 0, memory: 0, price: 0.750 },
];

export class OracleNoSQLAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Oracle NoSQL pricing (${ORACLE_NOSQL_INSTANCES.length} entries from static config)...`);
    return ORACLE_NOSQL_INSTANCES.map(inst => ({
      provider: 'oracle',
      service: 'Oracle NoSQL',
      region: 'us-ashburn-1',
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: '',
      cpuVendor: 'N/A',
      gpuCount: 0,
      geography: this.getGeography('us-ashburn-1'),
      category: 'NoSQL',
      price: inst.price,
      unit: 'RCU/WCU-Hour',
      dataSource: 'static_config' as const,
      attributes: {
        engine: 'Oracle NoSQL',
        engine_version: 'v1',
        deployment_type: inst.type.includes('On-Demand') ? 'Serverless' : 'Provisioned',
        ha_mode: 'Multi AZ',
        storage_type: 'Managed',
        tier: 'General Purpose',
      },
    }));
  }
}

// ─── DatabasePricingPipeline ───────────────────────────────────────────────────

export class DatabasePricingPipeline extends PricingPipeline {
  constructor(sql: Sql) {
    super(sql);
    // Replace the compute adapters with database adapters
    this.adapters = [
      new GCPCloudSQLAdapter(),
      new OracleAutonomousAdapter(),
      new OracleMySQLHeatWaveAdapter(),
      new OraclePostgreSQLAdapter(),
      new OracleRedisAdapter(),
      new AWSRDSAdapter(),
      new AWSElastiCacheAdapter(),
      new AWSDynamoDBAdapter(),
      new AWSDocumentDBAdapter(),
      new GCPMemorystoreAdapter(),
      new AzureDBAdapter(),
      new DigitalOceanDBAdapter(),
      new AlibabaDBAdapter(),
      new AlibabaRedisAdapter(),
      new GCPFirestoreAdapter(),
      new GCPBigtableAdapter(),
      new OracleNoSQLAdapter(),
      new VectorDatabasesAdapter(),
    ];
  }

  async run() {
    const results = [];
    for (const adapter of this.adapters) {
      try {
        const records = await adapter.fetchPricing();

        // Special handling for VectorDatabasesAdapter: group by provider and save separately
        if (adapter instanceof VectorDatabasesAdapter) {
          const recordsByProvider: Record<string, typeof records> = {};
          for (const record of records) {
            if (!recordsByProvider[record.provider]) recordsByProvider[record.provider] = [];
            recordsByProvider[record.provider].push(record);
          }

          for (const [providerSlug, providerRecords] of Object.entries(recordsByProvider)) {
            // Inserted, not fetched — see saveRecords().
            const inserted = await this.saveRecords(providerRecords, 'database');
            results.push({ provider: providerSlug, status: 'success', count: inserted });
          }
        } else {
          const inserted = await this.saveRecords(records, 'database');
          results.push({ provider: adapter.providerSlug, status: 'success', count: inserted });
        }
      } catch (error: any) {
        console.error(`Error running DB pipeline for ${adapter.providerSlug}:`, error);
        results.push({ provider: adapter.providerSlug, status: 'error', message: error.message });
      }
    }
    return results;
  }
}
