import axios from 'axios';
import type { Sql } from 'postgres';
import { ORACLE_INSTANCES, ORACLE_REGION, ORACLE_GEOGRAPHY } from '../config/oracle_instances';
import { fetchOracleCatalog, findPrice, nameIncludes, OracleProduct } from './oracle_price_list';
import { buildSignedUrl } from './alibaba_signer';
import { DIGITALOCEAN_INSTANCES, DIGITALOCEAN_REGION, DIGITALOCEAN_GEOGRAPHY } from '../config/digitalocean_instances.ts';
import { ALIBABA_INSTANCES, ALIBABA_REGION, ALIBABA_GEOGRAPHY } from '../config/alibaba_instances.ts';
import { DigitalOceanDropletsScraper } from '../scrapers/digitalocean_droplets.ts';
import { GCP_INSTANCES, GCP_REGION, GCP_GEOGRAPHY } from '../config/gcp_instances.ts';
import { fetchGcpComputeRates, gcpFamilyOf, gcpGpuModelOf } from './gcp_compute_rates';
import { PROVIDERS } from '../config/index.ts';
import { saveNormalizedPricingBatch } from './normalized_pricing.ts';
import {
  classifyAwsGpu, classifyAzureGpu, classifyGcpGpu, classifyOracleGpu,
  classifyAlibabaGpu, classifyDigitalOceanGpu, GPU_MODEL_SPECS,
} from '../config/gpu_models.ts';

// Merges a GPU classification into an attributes object (or returns the
// object unchanged when there's no match / no attributes to begin with).
// vramGbOverride lets a provider's own live data (e.g. AWS's gpuMemory field)
// win over the static catalog fallback.
function withGpuAttrs<T extends Record<string, any> | undefined>(
  attrs: T,
  classification: { model: string; vramGb: number } | null,
  vramGbOverride?: number,
): T | { gpu_model: string; gpu_vram_gb: number; gpu_vendor?: string } {
  if (!classification) return attrs as T;
  return {
    ...(attrs ?? {}),
    gpu_model: classification.model,
    gpu_vram_gb: vramGbOverride ?? classification.vramGb,
    gpu_vendor: GPU_MODEL_SPECS[classification.model]?.vendor,
  };
}

export interface PricingRecord {
  provider: string;
  service: string;
  region: string;
  instanceType: string;
  vcpus: number;
  memoryGb: number;
  arch: string;
  os: string;
  cpuVendor: string;
  gpuCount: number;
  geography: string;
  category: string;
  price: number;
  unit: string;
  attributes?: Record<string, any>;
  dataSource?: 'live_api' | 'static_config';
  supportedLanguages?: string[];
}

// Returns the DB id for a provider slug, auto-creating the provider row from
// config if it doesn't exist yet. Lets any pipeline ingest a config provider
// (e.g. cloudflare, vector DBs) without it being pre-seeded into the providers
// table — prevents whole services being silently dropped.
export async function ensureProviderId(sql: any, slug: string): Promise<string> {
  const existing = await sql`SELECT id FROM providers WHERE slug = ${slug}`;
  if (existing.length > 0) return existing[0].id;
  const name = PROVIDERS.find(p => p.id === slug)?.name
    ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const created = await sql`
    INSERT INTO providers (slug, name) VALUES (${slug}, ${name})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  return created[0].id;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Azure Retail Prices (prices.azure.com) is hit by 4 separate adapters in a
// single ingest run (VM compute, database, Databricks, Synapse), each paging
// through up to 10-20 requests per region x 2 regions — up to ~100 sequential
// calls to the same host with no delay between them. fetchWithRetry() already
// reacts to a 429 after the fact (honoring Retry-After), but a small proactive
// delay between pages/regions keeps the request rate under Azure's per-minute
// threshold in the first place, rather than relying on hitting the limit and
// backing off. Every other provider (AWS, GCP, Oracle, DigitalOcean, Alibaba)
// makes far fewer sequential calls per run and shows no evidence of
// rate-limiting, so this delay is scoped to Azure Retail Prices only rather
// than applied as a blanket policy across all adapters.
export const AZURE_RETAIL_API_PAGE_DELAY_MS = 350;
export const AZURE_RETAIL_API_REGION_DELAY_MS = 1500;

export async function fetchWithRetry(url: string, config: any = {}, retries = 3, timeout = 60000): Promise<any> {
  const mergedConfig = { timeout, ...config };
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, mergedConfig);
    } catch (err: any) {
      // Honor the server's Retry-After header (Azure's Retail Prices API sends
      // this on 429s) instead of our own fixed backoff — it tells us exactly
      // how long to wait, which is usually much longer than 2-6s.
      const retryAfterHeader = err.response?.headers?.['retry-after'];
      const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : null;
      console.warn(`Fetch failed for ${url.substring(0, 100)}... (attempt ${i + 1}/${retries}): ${err.message}`);
      if (i === retries - 1) throw err;
      await sleep(retryAfterMs && !isNaN(retryAfterMs) ? retryAfterMs : 2000 * (i + 1)); // Exponential backoff, or server-specified delay
    }
  }
}

export abstract class BaseAdapter {
  abstract providerSlug: string;
  abstract fetchPricing(): Promise<PricingRecord[]>;

  protected getGeography(region: string): string {
    const r = region.toLowerCase();
    if (r.includes('us-') || r.includes('us') || r.includes('america') || r.includes('canada') || r.includes('centralus') || r.includes('eastus') || r.includes('westus')) return 'N. America';
    if (r.includes('brazil') || r.includes('southamerica') || r.includes('sao') || r.includes('chile')) return 'S. America';
    if (r.includes('europe') || r.includes('uk-') || r.includes('france') || r.includes('germany') || r.includes('westcore') || r.includes('switzerland') || r.includes('northeurope') || r.includes('westeurope')) return 'W. Europe';
    if (r.includes('asia') || r.includes('japan') || r.includes('korea') || r.includes('india') || r.includes('singapore') || r.includes('tokyo') || r.includes('cn-') || r.includes('china') || r.includes('hangzhou')) return 'Asia Pacific';
    if (r.includes('australia')) return 'Australia';
    if (r.includes('me-') || r.includes('africa') || r.includes('uae') || r.includes('dubai')) return 'Mid East & Africa';
    return 'N. America';
  }

  protected getCpuVendor(sku: string): string {
    const s = sku.toLowerCase();

    if (s.includes('graviton')) return 'AWS';
    if (s.includes('ampere') || s.includes('altra')) return 'Ampere';
    if (s.includes('epyc') || s.includes('amd') || s.includes('_a') || s.includes('tau')) return 'AMD';
    if (s.includes('intel') || s.includes('xeon')) return 'Intel';

    if (s.match(/[a-z]\d+g/)) return 'AWS'; // Graviton
    if (s.match(/[a-z]\d+a/)) return 'AMD'; // e.g., t3a, m5a

    return 'Intel';
  }

  protected getGpuCount(sku: string): number {
    const s = sku.toUpperCase();
    if (s.startsWith('NC') || s.startsWith('ND') || s.startsWith('NV')) return 1;
    return 0;
  }

  protected categoryByRatio(vcpus: number, memoryGb: number): string {
    const ratio = vcpus > 0 ? memoryGb / vcpus : 4;
    if (ratio <= 2.1) return 'Compute optimized';
    if (ratio >= 7.5) return 'Memory optimized';
    return 'General purpose';
  }

  // AWS instance family → category. Source: AWS EC2 instance type families.
  protected classifyAws(instanceType: string, vcpus: number, memoryGb: number): string {
    const family = instanceType.split('.')[0].toLowerCase();
    const letter = family.replace(/[0-9].*$/, '');

    if (family.startsWith('hpc')) return 'HPC';
    if (family.startsWith('mac')) return 'General purpose';

    switch (letter) {
      case 't': return 'Burstable';
      case 'm': return 'General purpose';
      case 'c': return 'Compute optimized';
      case 'r': case 'x': case 'u': case 'z': return 'Memory optimized';
      case 'i': case 'd': case 'h': return 'Storage optimized';
      // GPU/accelerator families: g, p, inf, trn, dl, vt, f — fall back to ratio for the underlying CPU profile
      case 'g': case 'p': case 'inf': case 'trn': case 'dl': case 'vt': case 'f':
        return this.categoryByRatio(vcpus, memoryGb);
      default: return this.categoryByRatio(vcpus, memoryGb);
    }
  }

  // Azure VM series → category. Source: Azure VM size families (B/D/E/F/G/H/L/M/N).
  protected classifyAzure(instanceType: string, vcpus: number, memoryGb: number): string {
    const s = instanceType.toLowerCase();
    if (s.startsWith('standard_b') || s.startsWith('b')) return 'Burstable';
    if (s.startsWith('standard_h') || s.startsWith('h')) return 'HPC';
    if (s.startsWith('standard_l') || s.startsWith('l')) return 'Storage optimized';
    if (s.startsWith('standard_e') || s.startsWith('standard_m') || s.startsWith('standard_g') || /^[emg]\d/.test(s)) return 'Memory optimized';
    if (s.startsWith('standard_f') || /^f\d/.test(s)) return 'Compute optimized';
    if (s.startsWith('standard_d') || /^d\d/.test(s)) return 'General purpose';
    // N-series (NC/ND/NV) are GPU instances — fall back to ratio for the underlying CPU profile
    if (s.startsWith('standard_n') || /^n[cdv]/.test(s)) return this.categoryByRatio(vcpus, memoryGb);
    return this.categoryByRatio(vcpus, memoryGb);
  }

  // GCP machine series → category. Source: GCP Compute Engine machine families.
  protected classifyGcp(instanceType: string, vcpus: number, memoryGb: number): string {
    const s = instanceType.toLowerCase();
    if (s.startsWith('c2') || s.startsWith('c3') || s.startsWith('c4')) return 'Compute optimized';
    if (s.startsWith('m1') || s.startsWith('m2') || s.startsWith('m3') || s.includes('highmem')) return 'Memory optimized';
    if (s.startsWith('a2') || s.startsWith('a3') || s.startsWith('g2')) return this.categoryByRatio(vcpus, memoryGb);
    if (s.startsWith('e2') || s.startsWith('n1') || s.startsWith('n2') || s.startsWith('n4') || s.startsWith('t2')) return 'General purpose';
    return this.categoryByRatio(vcpus, memoryGb);
  }

  protected getCategory(sku: string, vcpus: number, memoryGb: number): string {
    return this.categoryByRatio(vcpus, memoryGb);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

export class AzureAdapter extends BaseAdapter {
  providerSlug = 'azure';

  // eastus is Azure's cheapest/baseline US region and is kept as the primary
  // reference region (consistent with AWS→us-east-1, GCP→us-central1,
  // DO→nyc1). westus2 is added alongside it — unlike AWS/GCP's "twin"
  // regions (which price within ~1-3% of their East counterpart), Azure's
  // *older* westus region runs 15-25% higher, and a single eastus reference
  // was silently standing in for all of "N. America" in the comparison
  // table. westus2 is priced close to eastus but still catches real
  // West-region variance without the cost of a full multi-region fetch.
  private static readonly REGIONS = ['eastus', 'westus2'];

  // Extract vCPU count from Azure VM SKU name.
  // Standard_D4s_v3→4, Standard_B2ms→2, Standard_NC6→6, Standard_M64s→64
  private vcpuFromSku(sku: string): number {
    let m = sku.match(/Standard_[A-Za-z]+(\d+)/);
    if (m) return parseInt(m[1]);
    // Newer GPU SKU names omit the "Standard_" prefix entirely (e.g. "NC8dsxlRTX6Kv6").
    m = sku.match(/^[A-Za-z]+(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }

  // Estimate memory based on Azure VM family ratios since Retail API omits it.
  private memoryFromSku(sku: string, vcpus: number): number {
    const s = sku.toLowerCase();
    if (s.startsWith('standard_e') || s.startsWith('standard_m') || s.startsWith('standard_g') || /^[emg]\d/.test(s)) return vcpus * 8;
    if (s.startsWith('standard_f') || /^f\d/.test(s)) return vcpus * 2;
    if (s.startsWith('standard_d') || /^d\d/.test(s)) return vcpus * 4;
    if (s.startsWith('standard_l') || /^l\d/.test(s)) return vcpus * 8;
    if (s.startsWith('standard_h') || /^h\d/.test(s)) return vcpus * 7;
    return vcpus * 4; // Default fallback (e.g. B-series, A-series)
  }

  async fetchPricing(): Promise<PricingRecord[]> {
    const records: PricingRecord[] = [];

    for (const [i, region] of AzureAdapter.REGIONS.entries()) {
      try {
        records.push(...(await this.fetchForRegion(region)));
      } catch (err: any) {
        // A single region failing (e.g. Azure Retail Prices API rate limit —
        // it allows very few requests per minute, and fetching N regions
        // across 4 different Azure adapters in one pipeline run can trip it)
        // must not discard whatever regions already succeeded.
        console.warn(`⚠️  Azure VM pricing fetch failed for ${region} (${err.message}) — keeping results from other regions.`);
      }
      if (i < AzureAdapter.REGIONS.length - 1) await sleep(AZURE_RETAIL_API_REGION_DELAY_MS);
    }

    console.log(`✅ Fetched ${records.length} Azure VM records across ${AzureAdapter.REGIONS.length} regions (some regions may have failed — see warnings above)`);
    return records;
  }

  private async fetchForRegion(region: string): Promise<PricingRecord[]> {
    console.log(`Fetching Azure VM pricing (${region})...`);
    const filter = encodeURIComponent(
      `serviceName eq 'Virtual Machines' and priceType eq 'Consumption' and armRegionName eq '${region}'`
    );
    let url: string | null = `https://prices.azure.com/api/retail/prices?$filter=${filter}`;
    const allItems: any[] = [];

    let pages = 0;
    while (url && pages < 10) {
      const response = await fetchWithRetry(url);
      allItems.push(...(response.data.Items ?? []));
      url = response.data.NextPageLink ?? null;
      pages++;
      if (url) await sleep(AZURE_RETAIL_API_PAGE_DELAY_MS);
    }

    const records: PricingRecord[] = [];
    // Deduplicate by SKU + OS — the API occasionally returns the same SKU
    // under multiple meter names (spot, dev/test, etc.) within one region.
    const seen = new Set<string>();

    for (const item of allItems) {
      if (!item.retailPrice || item.retailPrice <= 0) continue;

      const sku: string = (item.armSkuName ?? '').trim();
      if (!sku) continue;

      const productName: string = (item.productName ?? '').toLowerCase();
      const meterName: string = (item.meterName ?? '').toLowerCase();
      const os = productName.includes('windows') ? 'Windows' : 'Linux';

      // Skip dev-test pricing
      if (productName.includes('dev/test')) continue;

      // Skip classic Cloud Services meters. They share the VM's meterName (e.g.
      // "B2ats v2") but are a different, pricier product ("Basv2 Series Cloud
      // Services") that is not a VM SKU — and would otherwise compete with the
      // real VM row for the same dedupe key.
      if (productName.includes('cloud services')) continue;

      // Azure puts "Spot"/"Low Priority" in the METER name, not the product name:
      //   meterName "B2ats v2 Low Priority"  productName "Virtual Machines Basv2 Series"
      // Checking only productName therefore never matched, so Low-Priority/Spot
      // rates were ingested and labelled as On-Demand — understating Azure VM
      // prices by up to ~5x (B2ats_v2 showed $0.00188/hr vs the real $0.0094/hr)
      // and making Azure look far cheaper than every other provider.
      const isSpot = meterName.includes('spot') || meterName.includes('low priority')
        || productName.includes('spot') || productName.includes('low priority');
      if (isSpot) continue;
      
      const purchaseOption = 'OnDemand';

      const key = `${sku}::${os}::${purchaseOption}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const vcpus = this.vcpuFromSku(sku);
      const memoryGb = this.memoryFromSku(sku, vcpus);
      // Azure's ARM (Ampere Altra) sizes mark ARM with a 'p' immediately after
      // the vCPU count — Standard_D16ps_v6, Standard_B4ps_v2, Standard_D2pls_v5.
      // They contain no "arm64" marker, so the previous check labelled every
      // Azure ARM SKU as x86/Intel.
      const isArm = /\dp/.test(sku.toLowerCase());

      records.push({
        provider: 'azure',
        service: 'Virtual Machines',
        region,
        instanceType: sku,
        vcpus,
        memoryGb,
        arch: isArm ? 'ARM' : 'x86 64',
        os,
        cpuVendor: isArm ? 'Ampere' : this.getCpuVendor(sku),
        gpuCount: this.getGpuCount(sku),
        geography: 'N. America',
        category: this.classifyAzure(sku, vcpus, memoryGb),
        price: item.retailPrice,
        unit: '1 Hour',
        dataSource: 'live_api' as const,
        attributes: withGpuAttrs({ purchaseOption }, this.getGpuCount(sku) > 0 ? classifyAzureGpu(sku) : null),
      });
    }

    return records;
  }
}

export class AWSAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log('Fetching AWS pricing (us-east-1)...');
    const url = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json';
    const response = await fetchWithRetry(url);
    const products = response.data.products;
    const terms = response.data.terms.OnDemand;

    // Deduplicate: one record per (instanceType, OS) — standard on-demand only.
    const seen = new Set<string>();
    const records: PricingRecord[] = [];

    for (const sku of Object.keys(products)) {
      const product = products[sku];
      if (product.productFamily !== 'Compute Instance') continue;

      const attr = product.attributes;

      // Standard on-demand only — skip Dedicated/Host tenancy, capacity
      // reservations, and instances with pre-installed SQL Server licences.
      if (attr.tenancy !== 'Shared') continue;
      if (attr.capacitystatus !== 'Used') continue;
      if (attr.preInstalledSw !== 'NA') continue;

      const term = terms[sku];
      if (!term) continue;

      const offerKey = Object.keys(term)[0];
      const priceDimKey = Object.keys(term[offerKey].priceDimensions)[0];
      const priceDim = term[offerKey].priceDimensions[priceDimKey];
      const price = parseFloat(priceDim.pricePerUnit.USD);
      if (isNaN(price) || price <= 0) continue;

      const os = attr.operatingSystem === 'Windows' ? 'Windows' : 'Linux';
      const dedupeKey = `${attr.instanceType}::${os}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const vcpus = parseInt(attr.vcpu) || 2;
      let memoryGb = attr.memory ? parseFloat(attr.memory.replace(/,/g, '').split(' ')[0]) : 4;
      if (isNaN(memoryGb)) memoryGb = 4;
      // The AWS Price List exposes no 'architecture' attribute — it has
      // physicalProcessor ("AWS Graviton3 Processor") and processorArchitecture
      // ("64-bit"). So `attr.architecture === 'arm64'` never matched and every
      // Graviton instance (t4g, m6g, c7g…) was labelled 'x86 64', even though
      // cpuVendor correctly read 'AWS' off physicalProcessor.
      const isArm = /graviton/i.test(attr.physicalProcessor || '')
        || /arm64|aarch64/i.test(attr.processorArchitecture || '')
        || attr.architecture === 'arm64';

      const gpuCount = attr.gpu ? parseInt(attr.gpu) : 0;
      // AWS's own gpuMemory field ("640 GB HBM3") is the TOTAL across all GPUs
      // on the instance — divide by gpuCount for per-GPU VRAM, which is what
      // GPU_MODEL_SPECS and every other provider's classifier report.
      let awsVramOverride: number | undefined;
      if (gpuCount > 0 && attr.gpuMemory) {
        const totalGb = parseFloat(attr.gpuMemory);
        if (!isNaN(totalGb) && totalGb > 0) awsVramOverride = totalGb / gpuCount;
      }

      records.push({
        provider: 'aws',
        service: 'EC2',
        region: attr.regionCode || 'us-east-1',
        instanceType: attr.instanceType,
        vcpus,
        memoryGb,
        arch: isArm ? 'ARM' : 'x86 64',
        os,
        cpuVendor: this.getCpuVendor(attr.physicalProcessor || ''),
        gpuCount,
        geography: this.getGeography(attr.location || ''),
        category: this.classifyAws(attr.instanceType, vcpus, memoryGb),
        price,
        unit: priceDim.unit,
        dataSource: 'live_api' as const,
        attributes: withGpuAttrs(undefined, gpuCount > 0 ? classifyAwsGpu(attr.instanceType) : null, awsVramOverride),
      });
    }
    return records;
  }
}

export class GCPAdapter extends BaseAdapter {
  providerSlug = 'gcp';

  // Live pricing via Google's own Billing Catalog (cloudbilling.googleapis.com).
  // We keep GCP_INSTANCES as the shape catalog and recompute each shape's price
  // from live per-family core/ram rates (+ GPU device rate for a2/g2), exactly
  // like the Oracle Flex recompute. Per-record fallback to static config when a
  // family's rate isn't found — matched shapes are live_api, the rest static.
  async fetchPricing(): Promise<PricingRecord[]> {
    const apiKey = process.env.GCP_BILLING_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  GCP_BILLING_API_KEY not set — Compute Engine live pricing unavailable, using static config.');
      return this.fetchFromStaticConfig();
    }

    let rates;
    try {
      rates = await fetchGcpComputeRates(apiKey);
    } catch (err: any) {
      console.warn(`⚠️  GCP Compute live rates fetch failed (${err.message}), using static config.`);
      return this.fetchFromStaticConfig();
    }

    let liveCount = 0;
    const records: PricingRecord[] = GCP_INSTANCES.map(inst => {
      const family = gcpFamilyOf(inst.type);
      const fam = rates.families.get(family);
      let price = inst.price;
      let dataSource: 'live_api' | 'static_config' = 'static_config';

      if (fam) {
        let computed = fam.core * inst.vcpus + fam.ram * inst.memory;
        const gpuCount = inst.gpuCount ?? 0;
        if (gpuCount > 0) {
          const model = gcpGpuModelOf(family);
          const gpuRate = model ? rates.gpus.get(model) : undefined;
          // Can't fully price a GPU shape without its accelerator rate → stay static.
          computed = gpuRate != null ? computed + gpuRate * gpuCount : 0;
        }
        if (computed > 0) {
          price = computed;
          dataSource = 'live_api';
          liveCount++;
        }
      }

      return {
        provider: 'gcp',
        service: 'Compute Engine',
        region: GCP_REGION,
        instanceType: inst.type,
        vcpus: inst.vcpus,
        memoryGb: inst.memory,
        arch: inst.cpuVendor === 'Ampere' ? 'ARM' : 'x86 64',
        os: 'Linux',
        cpuVendor: inst.cpuVendor,
        gpuCount: inst.gpuCount ?? 0,
        geography: GCP_GEOGRAPHY,
        category: this.classifyGcp(inst.type, inst.vcpus, inst.memory),
        price,
        unit: 'Hour',
        dataSource,
        attributes: withGpuAttrs(undefined, (inst.gpuCount ?? 0) > 0 ? classifyGcpGpu(inst.type) : null),
      };
    });

    console.log(`✅ GCP compute: ${liveCount}/${records.length} priced live from Billing Catalog, ${records.length - liveCount} from static config.`);
    return records;
  }

  private fetchFromStaticConfig(): PricingRecord[] {
    console.log(`Fetching GCP pricing (static config fallback, ${GCP_INSTANCES.length} entries)...`);
    return GCP_INSTANCES.map(inst => ({
      provider: 'gcp',
      service: 'Compute Engine',
      region: GCP_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: inst.cpuVendor === 'Ampere' ? 'ARM' : 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: inst.gpuCount ?? 0,
      geography: GCP_GEOGRAPHY,
      category: this.classifyGcp(inst.type, inst.vcpus, inst.memory),
      price: inst.price,
      unit: 'Hour',
      dataSource: 'static_config' as const,
      attributes: withGpuAttrs(undefined, (inst.gpuCount ?? 0) > 0 ? classifyGcpGpu(inst.type) : null),
    }));
  }

}

// Oracle bills Flex VM shapes as separate OCPU-hour + GB-hour metered rates
// rather than one flat instance price (see oracle_price_list.ts). We keep the
// same representative shape sizes as the static config (that list is what
// drives which (OCPU, GB) combinations show up in the comparison table) but
// recompute each one's price from live per-unit rates when we can identify
// them unambiguously in the OCI price feed. Families whose live naming is too
// ambiguous to match safely (Standard3, Optimized3, Bare Metal, HPC) keep
// their static price — this is a per-record fallback, not per-provider, so a
// live-catalog hiccup for one family doesn't take down the rest.
const ORACLE_FLEX_FAMILIES: { prefix: string; familyToken: string }[] = [
  { prefix: 'VM.Standard.E4.Flex', familyToken: 'e4' },
  { prefix: 'VM.Standard.E5.Flex', familyToken: 'e5' },
  { prefix: 'VM.Standard.A2.Flex', familyToken: 'a2' },
];

const ORACLE_GPU_MODELS: { prefix: string; model: string; exclude?: string[] }[] = [
  { prefix: 'VM.GPU.A10.', model: 'a10', exclude: ['a100'] },
  { prefix: 'BM.GPU.A10.', model: 'a10', exclude: ['a100'] },
  { prefix: 'BM.GPU.L40S.', model: 'l40s' },
  { prefix: 'BM.GPU.A100-v2.', model: 'a100 - v2' },
  { prefix: 'BM.GPU.H100.', model: 'h100' },
  { prefix: 'BM.GPU.H200.', model: 'h200' },
];

export function findOracleFlexRates(catalog: OracleProduct[], familyToken: string): { ocpuRate: number; memRate: number } | null {
  const ocpuRate = findPrice(catalog, item => nameIncludes(item, 'compute', 'standard', familyToken, 'ocpu'));
  const memRate = findPrice(catalog, item => nameIncludes(item, 'compute', 'standard', familyToken, 'memory'));
  if (ocpuRate == null || memRate == null) return null;
  return { ocpuRate, memRate };
}

function findOracleGpuRate(catalog: OracleProduct[], model: string, exclude: string[] = []): number | null {
  // Match `model` as a whole token (not a substring of a longer model name
  // like "a10" inside "a100", or "h100" inside "h100t") by requiring
  // non-alphanumeric boundaries on both sides.
  const modelRe = new RegExp(`(^|[^a-z0-9])${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
  return findPrice(catalog, item => {
    const dn = item.displayName.toLowerCase();
    if (!dn.includes('gpu')) return false;
    if (dn.includes('nvidia ai enterprise')) return false;
    if (dn.includes('bare metal gpu standard') || dn.includes('vm gpu standard')) return false;
    if (dn.includes('vmware') || dn.includes('commit')) return false;
    if (!modelRe.test(dn)) return false;
    return !exclude.some(e => dn.includes(e));
  });
}

export class OracleAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    let catalog: OracleProduct[] | null = null;
    try {
      catalog = await fetchOracleCatalog();
      console.log(`Fetched OCI live price list (${catalog.length} SKUs) — recomputing Flex/GPU shape prices where possible.`);
    } catch (err: any) {
      console.warn(`⚠️  OCI live price list fetch failed (${err.message}), all Oracle compute prices will use static config.`);
    }

    // Pre-resolve per-unit rates once per pipeline run instead of per-instance.
    const flexRates = new Map<string, { ocpuRate: number; memRate: number }>();
    const gpuRates = new Map<string, number>();
    if (catalog) {
      for (const f of ORACLE_FLEX_FAMILIES) {
        const rates = findOracleFlexRates(catalog, f.familyToken);
        if (rates) flexRates.set(f.prefix, rates);
      }
      for (const g of ORACLE_GPU_MODELS) {
        const rate = findOracleGpuRate(catalog, g.model, g.exclude);
        if (rate != null) gpuRates.set(g.prefix, rate);
      }
    }

    let liveCount = 0;
    const records = ORACLE_INSTANCES.map(inst => {
      const gpuCount = inst.gpuCount ?? 0;
      const isHpc = inst.type.toLowerCase().includes('hpc');

      let price = inst.price;
      let dataSource: 'live_api' | 'static_config' = 'static_config';

      const flexFamily = ORACLE_FLEX_FAMILIES.find(f => inst.type.startsWith(f.prefix));
      const ocpuMatch = inst.type.match(/\((\d+)\s*OCPU/i);
      if (flexFamily && ocpuMatch) {
        const rates = flexRates.get(flexFamily.prefix);
        if (rates) {
          price = rates.ocpuRate * parseInt(ocpuMatch[1], 10) + rates.memRate * inst.memory;
          dataSource = 'live_api';
        }
      } else if (gpuCount > 0) {
        const gpuFamily = ORACLE_GPU_MODELS.find(g => inst.type.startsWith(g.prefix));
        if (gpuFamily) {
          const rate = gpuRates.get(gpuFamily.prefix);
          if (rate != null) {
            price = rate * gpuCount;
            dataSource = 'live_api';
          }
        }
      }
      if (dataSource === 'live_api') liveCount++;

      return {
        provider: 'oracle',
        service: 'OCI Compute',
        region: ORACLE_REGION,
        instanceType: inst.type,
        vcpus: inst.vcpus,
        memoryGb: inst.memory,
        arch: inst.cpuVendor === 'Ampere' || inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
        os: 'Linux',
        cpuVendor: inst.cpuVendor,
        gpuCount,
        geography: ORACLE_GEOGRAPHY,
        category: gpuCount > 0 ? 'GPU instance' : (isHpc ? 'HPC' : this.categoryByRatio(inst.vcpus, inst.memory)),
        price,
        unit: 'Hour',
        dataSource,
        attributes: withGpuAttrs(undefined, gpuCount > 0 ? classifyOracleGpu(inst.type) : null),
      };
    });

    console.log(`✅ Oracle compute: ${liveCount}/${records.length} records priced from live OCI rates, ${records.length - liveCount} from static config.`);
    return records;
  }
}

export class DigitalOceanAdapter extends BaseAdapter {
  providerSlug = 'digitalocean';

  // DigitalOcean Droplet families → category. Storage- and Memory-optimized
  // get matched by slug prefix; everything else falls back to the
  // memory:vCPU ratio so GPU droplets get a real CPU-profile category.
  protected classifyDigitalOcean(slug: string, vcpus: number, memoryGb: number): string {
    const s = slug.toLowerCase();
    if (s.startsWith('c-') || s.startsWith('c2-')) return 'Compute optimized';
    if (s.startsWith('m-') || s.startsWith('m3-') || s.startsWith('m6-')) return 'Memory optimized';
    if (s.startsWith('so-') || s.startsWith('so1-')) return 'Storage optimized';
    if (s.startsWith('gpu-')) return this.categoryByRatio(vcpus, memoryGb);
    return 'General purpose';
  }

  // Detect GPU count from a DigitalOcean GPU droplet slug like
  // "gpu-h100x1-80gb" or "gpu-mi300x1-192gb" — the number after `x` is
  // the GPU count.
  protected gpuCountFromSlug(slug: string): number {
    const m = slug.toLowerCase().match(/gpu-[a-z0-9]+x(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  async fetchPricing(): Promise<PricingRecord[]> {
    const token = process.env.DIGITALOCEAN_API_TOKEN;
    if (token) {
      try {
        const records = await this.fetchFromApi(token);
        if (records.length > 0) return records;
        console.warn('⚠️  DigitalOcean live API returned 0 priced sizes — falling back to static config.');
      } catch (err: any) {
        console.error(`❌ DigitalOcean live API fetch failed (${err.message}), falling back to static config.`);
      }
    } else {
      console.warn('⚠️  DIGITALOCEAN_API_TOKEN not set — using scraper fallback.');
    }
    return this.fetchFromScraper();
  }

  private async fetchFromApi(token: string): Promise<PricingRecord[]> {
    console.log('Fetching DigitalOcean pricing (live /v2/sizes API)...');
    const url = 'https://api.digitalocean.com/v2/sizes?per_page=200';
    const response = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const sizes: any[] = response.data?.sizes || [];
    // The DO API's `available` flag reflects per-account creation eligibility
    // (e.g. new accounts often can't create GPU or premium tiers without
    // approval), not whether the size exists in the public catalogue. For a
    // price-comparison use case we want every size that has a valid hourly
    // price, regardless of whether this particular token can launch it.
    const priced = sizes.filter(s => s.price_hourly > 0);
    console.log(`DO /v2/sizes returned ${sizes.length} sizes; ${priced.length} have a hourly price.`);
    const records = priced
      .map(s => {
        const slug = String(s.slug || '');
        const vcpus = Number(s.vcpus) || 1;
        // The DO API returns memory in MB; we store GB.
        const memoryGb = (Number(s.memory) || 0) / 1024;
        const isAmd = /(?:^|-)amd(?:-|$)/.test(slug.toLowerCase());
        const gpuCount = this.gpuCountFromSlug(slug);

        return {
          provider: 'digitalocean',
          service: 'Droplets',
          region: DIGITALOCEAN_REGION,
          instanceType: slug,
          vcpus,
          memoryGb,
          arch: 'x86 64',
          os: 'Linux',
          cpuVendor: isAmd ? 'AMD' : 'Intel',
          gpuCount,
          geography: DIGITALOCEAN_GEOGRAPHY,
          category: this.classifyDigitalOcean(slug, vcpus, memoryGb),
          price: Number(s.price_hourly),
          unit: 'Hour',
          dataSource: 'live_api' as const,
          attributes: withGpuAttrs(undefined, gpuCount > 0 ? classifyDigitalOceanGpu(slug) : null),
        } as PricingRecord;
      });

    console.log(`✅ Fetched ${records.length} DigitalOcean Droplet sizes from live API.`);
    return records;
  }

  private async fetchFromScraper(): Promise<PricingRecord[]> {
    console.log(`Fetching DigitalOcean pricing (from Playwright Scraper)...`);
    const scraper = new DigitalOceanDropletsScraper();
    const scrapedInstances = await scraper.run();
    
    // Merge scraped instances with static config instances (so we keep static GPU instances)
    const combinedMap = new Map<string, any>();
    for (const s of DIGITALOCEAN_INSTANCES) {
      combinedMap.set(s.slug, s);
    }
    for (const s of scrapedInstances) {
      combinedMap.set(s.slug, s);
    }

    return Array.from(combinedMap.values()).map(s => ({
      provider: 'digitalocean',
      service: 'Droplets',
      region: DIGITALOCEAN_REGION,
      instanceType: s.slug,
      vcpus: s.vcpus,
      memoryGb: s.memory,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: 'Intel',
      gpuCount: (s as any).gpuCount || 0,
      geography: DIGITALOCEAN_GEOGRAPHY,
      category: s.category || this.classifyDigitalOcean(s.slug, s.vcpus, s.memory),
      price: s.price,
      unit: 'Hour',
      dataSource: 'playwright_scraper' as any,
      attributes: withGpuAttrs(undefined, ((s as any).gpuCount || 0) > 0 ? classifyDigitalOceanGpu(s.slug) : null),
    }));
  }
}

// Alibaba's BSS OpenAPI exposes ECS pay-as-you-go pricing via
// GetPayAsYouGoPrice, signed with an AccessKey ID/Secret (see
// alibaba_signer.ts) — no paid subscription needed, just a RAM
// user/AccessKey with bssapi:GetPayAsYouGoPrice permission.
//
// Endpoint: Alibaba Cloud has two separate sites — the China site
// (aliyun.com) and the International site (alibabacloud.com) — and
// credentials from one generally can't call the other site's endpoints.
// The original `business.aliyuncs.com` (no region prefix) is the China-site
// domain; a live run against this account's key returned "NotApplicable:
// You are not authorized to call the API operation. Please check whether
// the caller site matches the API domain regionId" — the documented symptom
// of an International-site account (the norm for a non-China signup)
// hitting the China-site domain. Switched to the region-scoped domain,
// which International accounts should use instead. NOT YET reverified
// against a live run — if this specific error persists, the account may
// also be missing the BSS module's own authorization (a RAM policy like
// AliyunBSSReadOnlyAccess) separate from ECS permissions.
const ALIBABA_BSS_ENDPOINT = `business.${ALIBABA_REGION}.aliyuncs.com`;
async function fetchAlibabaEcsLiveRecords(): Promise<PricingRecord[] | null> {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET;
  if (!accessKeyId || !accessKeySecret) {
    console.warn('⚠️  ALIBABA_ACCESS_KEY_ID/SECRET not set — Alibaba ECS live pricing unavailable, using static config.');
    return null;
  }

  const creds = { accessKeyId, accessKeySecret };
  const records: PricingRecord[] = [];

  for (const [i, inst] of ALIBABA_INSTANCES.entries()) {
    // A small stagger between the 12 sequential GetPayAsYouGoPrice calls —
    // cheap insurance against per-second throttling on a fresh/free-tier
    // RAM account, which can have a much lower default QPS than a
    // provisioned one.
    if (i > 0) await sleep(300);
    try {
      // Config keys must match Alibaba's documented ECS pricing module exactly:
      // "InstanceType:...,IoOptimized:IoOptimized,ImageOs:linux". The region is a
      // TOP-LEVEL `Region` request param, NOT a `RegionId` config key — passing it
      // in the Config string caused "InvalidConfigCode ... config: RegionId:...".
      const configStr = [
        `InstanceType:${inst.type}`,
        'IoOptimized:IoOptimized',
        'ImageOs:linux',
      ].join(',');

      const url = buildSignedUrl(
        ALIBABA_BSS_ENDPOINT,
        'GetPayAsYouGoPrice',
        '2017-12-14',
        {
          ProductCode: 'ecs',
          SubscriptionType: 'PayAsYouGo',
          Region: ALIBABA_REGION,
          'ModuleList.1.ModuleCode': 'InstanceType',
          'ModuleList.1.Config': configStr,
          'ModuleList.1.PriceType': 'Hour',
        },
        creds
      );

      const response = await axios.get(url, { timeout: 15000 });

      // Alibaba returns HTTP 200 with a body `Code` field: "Success" on success,
      // an error code otherwise. Only treat NON-"Success" codes as errors —
      // previously any Code (including "Success") was thrown as an error.
      const code = response.data?.Code;
      if (code && code !== 'Success') {
        const errorMsg = response.data?.Message ?? JSON.stringify(response.data);
        throw new Error(`Alibaba API error ${code}: ${errorMsg}`);
      }

      // GetPayAsYouGoPrice returns the hourly cost inside the module detail.
      // Prefer the on-demand list price (OriginalCost) over the promo-adjusted
      // CostAfterDiscount for a stable comparison figure. One-time raw dump on
      // the first instance so the exact field is visible if extraction misses.
      const md = response.data?.Data?.ModuleDetails?.ModuleDetail?.[0];
      if (i === 0) {
        console.log(`🔍 Alibaba ${inst.type} raw Data: ${JSON.stringify(response.data?.Data)}`);
      }
      const rawPrice =
        response.data?.Data?.TradePrice ??
        md?.OriginalCost ??
        md?.CostAfterDiscount ??
        md?.UnitPrice;
      const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
      if (!price || isNaN(price) || price <= 0) continue;

      const gpuCount = inst.gpuCount ?? 0;
      records.push({
        provider: 'alibaba',
        service: 'Elastic Compute Service',
        region: ALIBABA_REGION,
        instanceType: inst.type,
        vcpus: inst.vcpus,
        memoryGb: inst.memory,
        arch: inst.cpuVendor === 'Ampere' ? 'ARM' : 'x86 64',
        os: 'Linux',
        cpuVendor: inst.cpuVendor,
        gpuCount,
        geography: ALIBABA_GEOGRAPHY,
        // Classify by memory:vCPU ratio (same thresholds as BaseAdapter.
        // categoryByRatio) — hardcoding 'General purpose' here mislabeled the
        // c7 (compute-optimized) and r7 (memory-optimized) families, making
        // Alibaba show N/A for any 'Compute optimized' workload requirement.
        category: (() => {
          const ratio = inst.vcpus > 0 ? inst.memory / inst.vcpus : 4;
          if (ratio <= 2.1) return 'Compute optimized';
          if (ratio >= 7.5) return 'Memory optimized';
          return 'General purpose';
        })(),
        price,
        unit: 'Hour',
        dataSource: 'live_api' as const,
        attributes: withGpuAttrs(undefined, gpuCount > 0 ? classifyAlibabaGpu(inst.type) : null),
      });
    } catch (err: any) {
      // Axios throws on non-2xx before our own status check runs, so the
      // actual Alibaba error code/message (in the response body) would
      // otherwise be swallowed behind a generic "Request failed with status
      // code 400". Surface err.response.data explicitly for diagnosis.
      const apiError = err.response?.data;
      const code = apiError?.Code ?? '';
      const detail = apiError ? `${code || 'UNKNOWN'}: ${apiError.Message ?? JSON.stringify(apiError)}` : err.message;
      const throttled = /throttl/i.test(code) ? ' [THROTTLED — consider increasing the delay between requests]' : '';
      console.warn(`⚠️  Alibaba live price fetch failed for ${inst.type} (${detail})${throttled}`);
    }
  }

  return records.length > 0 ? records : null;
}

export class AlibabaAdapter extends BaseAdapter {
  providerSlug = 'alibaba';

  async fetchPricing(): Promise<PricingRecord[]> {
    let liveRecords: PricingRecord[] | null = null;
    try {
      liveRecords = await fetchAlibabaEcsLiveRecords();
    } catch (err: any) {
      console.warn(`⚠️  Alibaba ECS live pricing fetch failed (${err.message}), falling back to static config.`);
    }

    // Live pricing is fetched per-instance-type above, so a partial failure
    // (some types succeed, others don't) already only includes the
    // successes — anything missing from liveRecords falls back to static
    // per-type here, same per-record honesty pattern as the Oracle adapter.
    const liveByType = new Map((liveRecords ?? []).map(r => [r.instanceType, r]));

    console.log(`Fetching Alibaba pricing (${liveByType.size}/${ALIBABA_INSTANCES.length} from live BSS OpenAPI, rest from static config)...`);
    return ALIBABA_INSTANCES.map(inst => {
      const live = liveByType.get(inst.type);
      if (live) return live;

      const gpuCount = inst.gpuCount ?? 0;
      return {
        provider: 'alibaba',
        service: 'Elastic Compute Service',
        region: ALIBABA_REGION,
        instanceType: inst.type,
        vcpus: inst.vcpus,
        memoryGb: inst.memory,
        arch: inst.cpuVendor === 'Ampere' ? 'ARM' : 'x86 64',
        os: 'Linux',
        cpuVendor: inst.cpuVendor,
        gpuCount,
        geography: ALIBABA_GEOGRAPHY,
        category: this.categoryByRatio(inst.vcpus, inst.memory),
        price: inst.price,
        unit: 'Hour',
        dataSource: 'static_config' as const,
        attributes: withGpuAttrs(undefined, gpuCount > 0 ? classifyAlibabaGpu(inst.type) : null),
      };
    });
  }
}

export class PricingPipeline {
  protected sql: Sql;
  protected adapters: BaseAdapter[];

  constructor(sql: Sql) {
    this.sql = sql;
    // Removed dangerous TLS override — all certificates are now validated properly.
    // If you encounter certificate validation errors, the root cause is the database
    // connection or intermediate CA setup, not external cloud provider APIs.
    // See OPERATIONS_RUNBOOK.md for troubleshooting TLS issues.

    
    this.adapters = [
      new AzureAdapter(),
      new AWSAdapter(),
      new GCPAdapter(),
      new OracleAdapter(),
      new DigitalOceanAdapter(),
      new AlibabaAdapter()
    ];
  }

  async run(): Promise<{ provider: string; status: string; count?: number; message?: string }[]> {
    const results = [];
    for (const adapter of this.adapters) {
      try {
        const records = await adapter.fetchPricing();
        // Count what was inserted, not what was fetched — see saveRecords().
        const inserted = await this.saveRecords(records);
        results.push({ provider: adapter.providerSlug, status: 'success', count: inserted });
      } catch (error: any) {
        console.error(`Error running ${adapter.providerSlug} pipeline:`, error);
        results.push({ provider: adapter.providerSlug, status: 'error', message: error.message });
      }
    }
    return results;
  }

  
  /**
   * Returns the number of rows ACTUALLY inserted, which is not always
   * `records.length` — duplicate-key rows are dropped before the insert. The
   * per-pipeline summaries used to report the fetched count, so a run that
   * fetched 28 Azure AI models and saved 19 printed "✅ AI: 28 configurations
   * inserted". These counts feed public data-volume claims, and the standing
   * rule (Web/CLAUDE.md) is that a published figure must be something you can
   * point at in one table. Return the real number so callers cannot inflate it.
   */
  protected async saveRecords(records: PricingRecord[], serviceCategory = 'compute'): Promise<number> {
    if (records.length === 0) return 0;

    const dataSource = records[0].dataSource ?? 'live_api';
    let insertedCount = 0;

    await this.sql.begin(async (sql) => {
      const providerSlug = records[0].provider;
      let providerRes = await sql`SELECT id FROM providers WHERE slug = ${providerSlug}`;

      if (providerRes.length === 0) {
        // Auto-create providers that exist in config but were never seeded into the
        // providers table (e.g. vector DB providers like pinecone/qdrant/weaviate).
        // Prevents a whole category from failing to ingest just because the DB
        // predates a config addition.
        const name = PROVIDERS.find(p => p.id === providerSlug)?.name
          ?? providerSlug.charAt(0).toUpperCase() + providerSlug.slice(1);
        providerRes = await sql`
          INSERT INTO providers (slug, name) VALUES (${providerSlug}, ${name})
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
      }
      const providerId = providerRes[0].id;

      // 1. Map Regions
      const regionMap = new Map<string, number>();
      const uniqueRegions = [...new Set(records.map(r => r.region))];

      for (const regionSlug of uniqueRegions) {
        const res = await sql`
          INSERT INTO regions (provider_id, slug) 
          VALUES (${providerId}, ${regionSlug}) 
          ON CONFLICT (provider_id, slug) DO UPDATE SET slug = EXCLUDED.slug 
          RETURNING id
        `;
        regionMap.set(regionSlug, res[0].id);
      }

      // 2. Ensure Service exists
      const serviceName = records[0].service;
      const serviceRes = await sql`
        INSERT INTO services (provider_id, name, category) 
        VALUES (${providerId}, ${serviceName}, ${serviceCategory}) 
        ON CONFLICT (provider_id, name) DO UPDATE SET category = EXCLUDED.category 
        RETURNING id
      `;
      const serviceId = serviceRes[0].id;

      // 3. Fetch old prices (for the previous_price_per_unit trend column) BEFORE deleting
      // Keyed by region+instance_type+os+arch+engine+ha_mode — matching the same
      // dimensions as the insert dedupe key below. instance_type alone is NOT
      // unique: RDS instance types (e.g. db.r5.large) are shared across up to 6
      // engines and 2 HA modes with very different prices, so omitting
      // engine/ha_mode would collapse distinct products into one arbitrary "old
      // price" (confirmed 2026-07-17 against AWS RDS rows).
      const oldPriceRes = await sql`
        SELECT reg.slug AS region_slug, pr.instance_type, pr.os, pr.arch,
               pr.attributes->>'engine' AS engine, pr.attributes->>'ha_mode' AS ha_mode,
               pr.price_per_unit
        FROM pricing_records pr
        JOIN regions reg ON reg.id = pr.region_id
        WHERE pr.service_id = ${serviceId}
      `;
      const oldPriceKey = (region: string, instanceType: string, os: string, arch: string, engine?: string, haMode?: string) =>
        `${region}|${instanceType}|${os}|${arch}|${engine ?? ''}|${haMode ?? ''}`;
      const oldPriceMap = new Map<string, number>();
      for (const row of oldPriceRes) {
        oldPriceMap.set(oldPriceKey(row.region_slug, row.instance_type, row.os, row.arch, row.engine, row.ha_mode), parseFloat(row.price_per_unit));
      }

      // 4. Delete old records
      await sql`DELETE FROM pricing_records WHERE service_id = ${serviceId}`;

      // 5. Batch Insert Pricing Records
      // Dedupe against the DB's unique constraint key (service_id, region_id,
      // instance_type, os, arch, engine, ha_mode) before inserting. Some
      // provider feeds (e.g. Azure Retail Prices, which mixes tiers/SKUs that
      // normalize to the same instance_type+engine+ha_mode within one region)
      // occasionally emit two rows that collide on this key — without this,
      // a single colliding pair aborts the ENTIRE insert (and the whole
      // category for that provider/region) via a 23505 constraint violation.
      const seenKeys = new Set<string>();
      let duplicateCount = 0;
      const rowsToInsert = records.filter(r => {
        const attrsForKey = r.attributes ?? {};
        const key = [serviceId, regionMap.get(r.region), r.instanceType, r.os, r.arch,
          (attrsForKey as any).engine ?? '', (attrsForKey as any).ha_mode ?? ''].join('|');
        if (seenKeys.has(key)) { duplicateCount++; return false; }
        seenKeys.add(key);
        return true;
      }).map(r => {
        const attrs = { ...r.attributes };
        if (r.supportedLanguages && r.supportedLanguages.length > 0) {
          attrs.supportedLanguages = r.supportedLanguages;
        }
        const prevPrice = oldPriceMap.get(oldPriceKey(r.region, r.instanceType, r.os, r.arch, attrs.engine, attrs.ha_mode));
        return {
          service_id: serviceId,
          region_id: regionMap.get(r.region),
          instance_type: r.instanceType,
          vcpus: r.vcpus,
          memory_gb: r.memoryGb,
          arch: r.arch,
          os: r.os,
          cpu_vendor: r.cpuVendor,
          gpu_count: r.gpuCount,
          geography: r.geography,
          category: r.category,
          price_per_unit: r.price,
          previous_price_per_unit: prevPrice ?? null,
          unit: r.unit,
          attributes: Object.keys(attrs).length > 0 ? this.sql.json(attrs) : null,
          data_source: r.dataSource ?? dataSource
        };
      });
      if (duplicateCount > 0) {
        console.warn(`⚠️  Dropped ${duplicateCount} duplicate-key row(s) for ${providerSlug} (${serviceCategory}) before insert.`);
      }

      // postgres.js bulk insert in batches — postgres.js has a 65,534-parameter
      // limit per query. With ~15 columns per row, that's ~4,300 rows max per
      // query. Batch in chunks of 1,000 to stay safely under the limit.
      if (rowsToInsert.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < rowsToInsert.length; i += batchSize) {
          const batch = rowsToInsert.slice(i, i + batchSize);
          await sql`INSERT INTO pricing_records ${sql(batch)}`;
        }
      }
      // Captured inside the transaction, returned after it commits — this is
      // the figure the "✅ Saved N records" line below already prints, so the
      // summary and the per-provider line can no longer disagree.
      insertedCount = rowsToInsert.length;

      // 6. Mirror into the normalized catalog used by the Premium features.
      // Only anchor regions are projected: sku_catalog/regional_prices exist to
      // serve spec-level cross-cloud matching, and non-anchor regions are
      // resolved at query time via regional_modifiers rather than stored. If a
      // provider has no anchors configured yet, project everything rather than
      // dropping the provider from the premium catalog entirely.
      const anchorRows = await sql`
        SELECT id FROM regions WHERE provider_id = ${providerId} AND is_anchor = TRUE
      `;
      const anchorRegionIds = new Set<number>(anchorRows.map((r: any) => r.id));

      // Built from `records` rather than `rowsToInsert`: the latter has already
      // wrapped attributes in sql.json() for the bulk insert, and that wrapper
      // cannot be re-serialized by the normalized writer.
      const normalizedRows = records
        .map(r => {
          const attrs: Record<string, any> = { ...r.attributes };
          if (r.supportedLanguages && r.supportedLanguages.length > 0) {
            attrs.supportedLanguages = r.supportedLanguages;
          }
          return {
            serviceId: serviceId as number,
            regionId: regionMap.get(r.region) as number,
            instanceType: r.instanceType,
            vcpus: r.vcpus,
            memoryGb: r.memoryGb,
            arch: r.arch,
            os: r.os,
            cpuVendor: r.cpuVendor,
            gpuCount: r.gpuCount,
            attributes: Object.keys(attrs).length > 0 ? attrs : null,
            pricePerUnit: r.price,
            unit: r.unit,
          };
        })
        .filter(r => r.instanceType && r.regionId != null)
        .filter(r => anchorRegionIds.size === 0 || anchorRegionIds.has(r.regionId));

      if (normalizedRows.length > 0) {
        const norm = await saveNormalizedPricingBatch(sql, normalizedRows);
        console.log(`   ↳ normalized: ${norm.skus} SKUs / ${norm.prices} anchor prices${norm.skipped > 0 ? ` (${norm.skipped} skipped)` : ''}`);
      }

      const hasLive = records.some(r => (r.dataSource ?? dataSource) === 'live_api');
      const hasStatic = records.some(r => (r.dataSource ?? dataSource) === 'static_config');
      const logSource = (hasLive && hasStatic) ? 'mixed' : (hasLive ? 'live_api' : 'static_config');
      console.log(`✅ Saved ${rowsToInsert.length} records for ${providerSlug} (${serviceCategory}, source: ${logSource})`);
    });

    return insertedCount;
  }
}
