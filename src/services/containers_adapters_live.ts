import axios from 'axios';
import { BaseAdapter, PricingRecord, findOracleFlexRates } from './pricing_pipeline';
import { AWS_CONTAINERS, AWS_CONTAINERS_REGION, AWS_CONTAINERS_GEOGRAPHY } from '../config/aws_containers';
import { AZURE_CONTAINERS, AZURE_CONTAINERS_REGION, AZURE_CONTAINERS_GEOGRAPHY } from '../config/azure_containers';
import { GCP_CONTAINERS, GCP_CONTAINERS_REGION, GCP_CONTAINERS_GEOGRAPHY } from '../config/gcp_containers';
import { DIGITALOCEAN_CONTAINERS, DIGITALOCEAN_CONTAINERS_REGION, DIGITALOCEAN_CONTAINERS_GEOGRAPHY } from '../config/digitalocean_containers';
import { ORACLE_CONTAINERS, ORACLE_CONTAINERS_REGION, ORACLE_CONTAINERS_GEOGRAPHY } from '../config/oracle_containers';
import { fetchGcpCloudRunRates } from './serverless_adapters_live';
import { fetchOracleCatalog } from './oracle_price_list';

// Arch-correct row mapper for containers: the static configs carry an
// explicit `architecture` field ('x86' | 'ARM'), so we trust that rather than
// guessing arch from cpuVendor (which mislabels Ampere/ARM rows as x86 —
// GCP's GKE T2A, Oracle's A1/OKE-A1, Azure's AKS Ampere nodes).
function mapConfigContainerRow(
  inst: any,
  slug: string,
  region: string,
  geography: string,
  price: number,
  dataSource: 'live_api' | 'static_config'
): PricingRecord {
  return {
    provider: slug,
    service: 'Containers',
    region,
    instanceType: inst.type,
    vcpus: inst.vcpus,
    memoryGb: inst.memory,
    arch: inst.architecture === 'ARM' ? 'ARM' : 'x86 64',
    os: 'Linux',
    cpuVendor: inst.cpuVendor,
    gpuCount: 0,
    geography,
    category: 'containers',
    price,
    unit: 'Hourly',
    dataSource,
    attributes: inst.attributes,
  };
}

// AWS Fargate is priced per vCPU-hour + per GB-hour, split by architecture
// (x86 vs Graviton/ARM), and published in the SAME public, keyless AWS Price
// List API used for Lambda/RDS — no headless-browser scraping (which failed on
// DO with a missing libnspr4.so) and no credentials. Returns rates for both
// architectures; EKS node rows are just EC2 VM prices (covered live under
// compute) and stay static, mirroring GKE handling in GCPContainersLiveAdapter.
interface FargateRates { x86: { cpu: number; mem: number }; arm: { cpu: number; mem: number }; }

async function fetchFargateRates(region: string): Promise<FargateRates> {
  const url = `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/${region}/index.json`;
  const { data } = await axios.get(url, { timeout: 60000 });
  const products: Record<string, any> = data.products ?? {};
  const onDemand: Record<string, any> = data.terms?.OnDemand ?? {};

  const priceOf = (sku: string): number | null => {
    for (const term of Object.values<any>(onDemand[sku] ?? {})) {
      for (const dim of Object.values<any>(term.priceDimensions ?? {})) {
        const usd = dim.pricePerUnit?.USD;
        if (usd != null) { const p = parseFloat(usd); if (p > 0) return p; }
      }
    }
    return null;
  };
  const rate = (pred: (usagetype: string) => boolean): number | null => {
    for (const [sku, p] of Object.entries(products)) {
      if (pred(p.attributes?.usagetype ?? '')) { const price = priceOf(sku); if (price != null) return price; }
    }
    return null;
  };

  const x86cpu = rate(u => /Fargate-vCPU-Hours/.test(u) && !/ARM|Windows/.test(u));
  const x86mem = rate(u => /Fargate-GB-Hours/.test(u) && !/ARM|Windows|Ephemeral/.test(u));
  const armcpu = rate(u => /Fargate-ARM-vCPU-Hours/.test(u));
  const armmem = rate(u => /Fargate-ARM-GB-Hours/.test(u));
  if (x86cpu == null || x86mem == null || armcpu == null || armmem == null) {
    throw new Error(`Fargate rates incomplete (x86cpu=${x86cpu} x86mem=${x86mem} armcpu=${armcpu} armmem=${armmem})`);
  }
  return { x86: { cpu: x86cpu, mem: x86mem }, arm: { cpu: armcpu, mem: armmem } };
}

export class AWSContainersLiveAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    let rates: FargateRates;
    try {
      rates = await fetchFargateRates(AWS_CONTAINERS_REGION);
    } catch (err: any) {
      console.warn(`⚠️  AWS Fargate live pricing fetch failed (${err.message}), using static config.`);
      return [];
    }

    let liveCount = 0;
    const records = AWS_CONTAINERS.map((inst: any) => {
      if (inst.type.startsWith('Fargate-')) {
        liveCount++;
        const r = inst.architecture === 'ARM' ? rates.arm : rates.x86;
        const price = inst.vcpus * r.cpu + inst.memory * r.mem;
        return mapConfigContainerRow(inst, 'aws', AWS_CONTAINERS_REGION, AWS_CONTAINERS_GEOGRAPHY, price, 'live_api');
      }
      return mapConfigContainerRow(inst, 'aws', AWS_CONTAINERS_REGION, AWS_CONTAINERS_GEOGRAPHY, inst.price, 'static_config');
    });
    console.log(`✅ AWS Containers: ${liveCount}/${records.length} rows (Fargate) priced live, rest (EKS nodes) from static config.`);
    return records;
  }
}

// Azure Container Instances is priced per vCPU-hour + per GB-hour on the public,
// keyless Azure Retail Prices API (same source as Functions/VMs/DB) — replacing
// the headless-browser scraper that failed on DO. AKS node rows are VM prices
// and stay static.
async function fetchAciRates(region: string): Promise<{ cpu: number; mem: number }> {
  const filter = encodeURIComponent(`serviceName eq 'Container Instances' and armRegionName eq '${region}'`);
  const url = `https://prices.azure.com/api/retail/prices?$filter=${filter}`;
  const { data } = await axios.get(url, { timeout: 30000 });
  const items: any[] = data.Items ?? [];
  // Standard (non-GPU, non-Spot, non-Confidential) Linux vCPU + Memory duration.
  const find = (meter: string, unitFrag: string) => items.find(i =>
    i.productName === 'Container Instances' && i.skuName === 'Standard' &&
    i.meterName === meter && (i.unitOfMeasure || '').includes(unitFrag) && i.retailPrice > 0);
  const cpu = find('Standard vCPU Duration', 'Hour')?.retailPrice ?? null;
  const mem = find('Standard Memory Duration', 'GB Hour')?.retailPrice ?? null;
  if (cpu == null || mem == null) throw new Error(`ACI rates incomplete (cpu=${cpu} mem=${mem})`);
  return { cpu, mem };
}

export class AzureContainersLiveAdapter extends BaseAdapter {
  providerSlug = 'azure';

  async fetchPricing(): Promise<PricingRecord[]> {
    let rates: { cpu: number; mem: number };
    try {
      rates = await fetchAciRates(AZURE_CONTAINERS_REGION);
    } catch (err: any) {
      console.warn(`⚠️  Azure ACI live pricing fetch failed (${err.message}), using static config.`);
      return [];
    }

    let liveCount = 0;
    const records = AZURE_CONTAINERS.map((inst: any) => {
      if (inst.type.startsWith('ACI-')) {
        liveCount++;
        const price = inst.vcpus * rates.cpu + inst.memory * rates.mem;
        return mapConfigContainerRow(inst, 'azure', AZURE_CONTAINERS_REGION, AZURE_CONTAINERS_GEOGRAPHY, price, 'live_api');
      }
      return mapConfigContainerRow(inst, 'azure', AZURE_CONTAINERS_REGION, AZURE_CONTAINERS_GEOGRAPHY, inst.price, 'static_config');
    });
    console.log(`✅ Azure Containers: ${liveCount}/${records.length} rows (ACI) priced live, rest (AKS nodes) from static config.`);
    return records;
  }
}

// Only the Cloud Run rows in GCP_CONTAINERS have a live source (the same
// Billing Catalog CPU/Memory Allocation Time rates used by
// GCPCloudRunLiveAdapter in the serverless category). GKE node prices are
// really just Compute Engine VM prices, already covered live under the
// compute category — recomputing them here too would duplicate that
// integration for no extra accuracy, so those rows stay static. Returns the
// FULL row set every time (live-recomputed Cloud Run rows + static GKE rows)
// so the pipeline's live-vs-static fallback logic (which swaps in the entire
// static config if this returns anything non-empty) doesn't silently drop
// the GKE rows.
export class GCPContainersLiveAdapter extends BaseAdapter {
  providerSlug = 'gcp';

  async fetchPricing(): Promise<PricingRecord[]> {
    const apiKey = process.env.GCP_BILLING_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  GCP_BILLING_API_KEY not set — GCP Containers live pricing unavailable, using static config.');
      return [];
    }

    let cpuRate: number | null = null;
    let memRate: number | null = null;
    try {
      const rates = await fetchGcpCloudRunRates(apiKey);
      cpuRate = rates.cpuRate;
      memRate = rates.memRate;
    } catch (err: any) {
      console.warn(`⚠️  GCP Containers live pricing fetch failed (${err.message}), using static config.`);
      return [];
    }

    let liveCount = 0;
    const records = GCP_CONTAINERS.map(inst => {
      const isCloudRun = inst.type.startsWith('CloudRun-') && inst.type.endsWith('-x86');
      if (isCloudRun && cpuRate != null && memRate != null) {
        liveCount++;
        const price = (cpuRate * inst.vcpus * 3600) + (memRate * inst.memory * 3600);
        return mapConfigContainerRow(inst, 'gcp', GCP_CONTAINERS_REGION, GCP_CONTAINERS_GEOGRAPHY, price, 'live_api');
      }
      return mapConfigContainerRow(inst, 'gcp', GCP_CONTAINERS_REGION, GCP_CONTAINERS_GEOGRAPHY, inst.price, 'static_config');
    });

    console.log(`✅ GCP Containers: ${liveCount}/${records.length} rows (Cloud Run) priced live, rest (GKE) from static config.`);
    return records;
  }
}

// DOKS node prices are just Droplet prices — DOKS nodes ARE droplets under
// the hood — so this reuses DigitalOcean's public /v2/sizes API (same one
// DigitalOceanAdapter uses for compute) rather than a container-specific
// endpoint. App Platform entries have no equivalent live source and stay
// static. Returns the full row set every time, same reasoning as GCP above.
export class DigitalOceanContainersLiveAdapter extends BaseAdapter {
  providerSlug = 'digitalocean';

  // "DOKS-s-2vcpu-4gb" -> "s-2vcpu-4gb" (the underlying Droplet slug)
  private droptletSlugFor(instanceType: string): string | null {
    return instanceType.startsWith('DOKS-') ? instanceType.slice('DOKS-'.length) : null;
  }

  async fetchPricing(): Promise<PricingRecord[]> {
    const token = process.env.DIGITALOCEAN_API_TOKEN;
    if (!token) {
      console.warn('⚠️  DIGITALOCEAN_API_TOKEN not set — DigitalOcean Containers live pricing unavailable, using static config.');
      return [];
    }

    let priceBySlug: Map<string, number>;
    try {
      const response = await axios.get('https://api.digitalocean.com/v2/sizes?per_page=200', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });
      const sizes: any[] = response.data?.sizes ?? [];
      priceBySlug = new Map(sizes.filter(s => s.price_hourly > 0).map(s => [String(s.slug), Number(s.price_hourly)]));
    } catch (err: any) {
      console.warn(`⚠️  DigitalOcean Containers live pricing fetch failed (${err.message}), using static config.`);
      return [];
    }

    let liveCount = 0;
    const records = DIGITALOCEAN_CONTAINERS.map(inst => {
      const slug = this.droptletSlugFor(inst.type);
      const livePrice = slug ? priceBySlug.get(slug) : undefined;
      if (livePrice != null) {
        liveCount++;
        return mapConfigContainerRow(inst, 'digitalocean', DIGITALOCEAN_CONTAINERS_REGION, DIGITALOCEAN_CONTAINERS_GEOGRAPHY, livePrice, 'live_api');
      }
      return mapConfigContainerRow(inst, 'digitalocean', DIGITALOCEAN_CONTAINERS_REGION, DIGITALOCEAN_CONTAINERS_GEOGRAPHY, inst.price, 'static_config');
    });

    console.log(`✅ DigitalOcean Containers: ${liveCount}/${records.length} rows (DOKS) priced live, rest (App Platform) from static config.`);
    return records;
  }
}

// Container-Instance-E4-* and OKE-VM.Standard.E4.Flex-* are priced from the
// same OCI Standard.E4 (x86/AMD) OCPU+Memory rates as Oracle's compute
// category (see oracle_price_list.ts / findOracleFlexRates in
// pricing_pipeline.ts) — recomputed live here the same way. The A1 (ARM)
// rows keep their static price: the OCI price feed reports a $0
// PAY_AS_YOU_GO value for Standard.A1, which looks like a free-tier
// artifact rather than the real rate (same issue documented on
// OracleAdapter's compute A1 handling) — recomputing from it would silently
// under-price these rows rather than leave them at their known-good static
// value.
export class OracleContainersLiveAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    let e4Rates: { ocpuRate: number; memRate: number } | null = null;
    try {
      const catalog = await fetchOracleCatalog();
      e4Rates = findOracleFlexRates(catalog, 'e4');
    } catch (err: any) {
      console.warn(`⚠️  OCI live price list fetch failed for containers (${err.message}), using static config.`);
    }

    let liveCount = 0;
    const records = ORACLE_CONTAINERS.map(inst => {
      const isX86E4 = inst.cpuVendor === 'AMD'; // AMD-tagged rows are all Standard.E4-based in this config
      if (isX86E4 && e4Rates) {
        liveCount++;
        const ocpus = inst.vcpus / 2; // x86: 1 OCPU = 2 vCPU
        const price = e4Rates.ocpuRate * ocpus + e4Rates.memRate * inst.memory;
        return mapConfigContainerRow(inst, 'oracle', ORACLE_CONTAINERS_REGION, ORACLE_CONTAINERS_GEOGRAPHY, price, 'live_api');
      }
      return mapConfigContainerRow(inst, 'oracle', ORACLE_CONTAINERS_REGION, ORACLE_CONTAINERS_GEOGRAPHY, inst.price, 'static_config');
    });

    console.log(`✅ Oracle Containers: ${liveCount}/${records.length} rows (E4/x86) priced live, rest (A1/ARM) from static config.`);
    return records;
  }
}
