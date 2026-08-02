import { PricingRecord, PricingPipeline } from './pricing_pipeline';

import {
  AZURE_APP_HOSTING_REGIONS,
  AWS_APP_HOSTING_REGIONS,
  GCP_APP_HOSTING_REGIONS,
  DO_APP_HOSTING_REGIONS,
  ORACLE_APP_HOSTING_REGIONS,
  ALIBABA_APP_HOSTING_REGIONS,
  CLOUDFLARE_APP_HOSTING_REGIONS,
  type AppHostingRegion,
} from '../config/app_hosting';

interface AppHostingConfigEntry {
  type: string;
  price: number;
  unit: string;
  vcpus: number;
  memory_gb: number;
  attributes: Record<string, any>;
}

function mapRegion(rows: AppHostingConfigEntry[], slug: string, region: string, geography: string): PricingRecord[] {
  return rows.map(inst => ({
    provider: slug,
    service: 'App Hosting',
    region,
    instanceType: inst.type,
    vcpus: inst.vcpus || 0,
    memoryGb: inst.memory_gb || 0,
    arch: '',
    os: inst.attributes?.os || 'Linux',
    cpuVendor: '',
    gpuCount: 0,
    geography,
    category: 'app-hosting',
    price: inst.price,
    unit: inst.unit,
    dataSource: 'static_config' as const,
    attributes: inst.attributes || {},
  }));
}

const STATIC_PROVIDERS: { slug: string; regions: AppHostingRegion[] }[] = [
  { slug: 'aws',          regions: AWS_APP_HOSTING_REGIONS },
  { slug: 'azure',        regions: AZURE_APP_HOSTING_REGIONS },
  { slug: 'gcp',          regions: GCP_APP_HOSTING_REGIONS },
  { slug: 'oracle',       regions: ORACLE_APP_HOSTING_REGIONS },
  { slug: 'digitalocean', regions: DO_APP_HOSTING_REGIONS },
  { slug: 'alibaba',      regions: ALIBABA_APP_HOSTING_REGIONS },
  { slug: 'cloudflare',   regions: CLOUDFLARE_APP_HOSTING_REGIONS },
];

export class AppHostingPricingPipeline extends PricingPipeline {
  async run() {
    const results: any[] = [];

    for (const p of STATIC_PROVIDERS) {
      const totalRows = p.regions.reduce((sum, r) => sum + r.rows.length, 0);
      console.log(`⏳ App Hosting: ${p.slug} (${totalRows} entries across ${p.regions.length} regions)...`);
      try {
        const records = p.regions.flatMap(r => mapRegion(r.rows, p.slug, r.region, r.geography));
        await this.saveRecords(records, 'app-hosting');
        results.push({
          provider: p.slug,
          service: 'App Hosting',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: `${p.slug} App Hosting - ${p.regions.length} regions`,
        });
      } catch (error: any) {
        console.warn(`⚠️  App Hosting ${p.slug} error:`, error.message);
        results.push({ provider: p.slug, service: 'App Hosting', status: 'error', message: error.message });
      }
    }
    return results;
  }
}
