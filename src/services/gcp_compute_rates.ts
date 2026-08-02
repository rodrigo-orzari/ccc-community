// Live GCP Compute Engine per-family rates from Google's Billing Catalog
// (cloudbilling.googleapis.com) — the SAME first-party API used for Cloud Run.
// Replaces the dead cloudpricingcalculator.appspot.com JSON (404).
//
// We don't enumerate every instance from the catalog; instead we resolve each
// machine family's per-vCPU ("Core") and per-GB ("Ram") on-demand rate, plus
// GPU device rates, and the GCPAdapter recomputes the price of each shape in
// GCP_INSTANCES as:  core*vCPUs + ram*GB (+ gpuRate*gpuCount).  Same pattern as
// the Oracle Flex recompute and the Cloud Run rate lookup.
//
// SKU naming is Google's and has changed before, so this is SELF-DIAGNOSING:
// on any missing family/GPU it dumps the candidate "Instance Core/Ram" and GPU
// SKU descriptions to the ingest log, so the matcher can be corrected precisely.

import { findGcpServiceName, fetchAllSkus } from './gcp_billing_catalog';

const REGION = 'us-central1';

// Families present in GCP_INSTANCES (src/config/gcp_instances.ts).
const FAMILIES = ['e2', 'n1', 'n2', 'n2d', 't2a', 't2d', 'c2', 'c2d', 'c3', 'm1', 'a2', 'g2'];

export interface GcpComputeRates {
  families: Map<string, { core: number; ram: number }>; // key: lowercase family token
  gpus: Map<string, number>;                             // key: 'a100' | 'l4'
}

const inRegion = (s: any): boolean =>
  (s.serviceRegions ?? []).some((r: string) => r === REGION || r === 'global');

// On-demand only: exclude committed-use, spot/preemptible, sole-tenancy, custom,
// and extended-memory SKUs so we price the standard predefined on-demand rate.
const isOnDemand = (d: string): boolean =>
  !/spot|preemptible|commitment|committed|sole ?tenan|custom|extended|reserved/i.test(d);

function skuPrice(sku: any): number | null {
  const tiers = sku?.pricingInfo?.[0]?.pricingExpression?.tieredRates ?? [];
  const rate = tiers[tiers.length - 1]?.unitPrice;
  if (!rate) return null;
  const price = parseInt(rate.units ?? '0', 10) + (rate.nanos ?? 0) / 1e9;
  return price > 0 ? price : null;
}

// Matches e.g. "N2 Instance Core running in Americas" and, for N1,
// "N1 Predefined Instance Core running in Americas".
//
// The word "Instance" is NOT reliably present. Google names the same component
// differently by region: us-central1's C2 SKUs are "Compute optimized Core
// running in Americas" while Dallas and Berlin use "Compute optimized Instance
// Core" (verified against the live catalogue 2026-07-27). Requiring /instance/
// therefore silently dropped C2 in exactly the region we price from, which is
// why it stayed static while eleven other families resolved.
//
// Component kind (CPU vs RAM) is taken from `category.resourceGroup`, which is
// structured data, rather than inferred from the description text. The text
// regex remains only as a fallback for SKUs that omit the field.
function findFamilyRate(skus: any[], family: string, kind: 'core' | 'ram'): number | null {
  const isC2 = family === 'c2';
  const isM1 = family === 'm1';
  const famRe = isC2
    ? /\bc2\b|compute[-\s]?optimized/i
    : isM1
    ? /\bm1\b|memory[-\s]?optimized/i
    : new RegExp(`\\b${family}\\b`, 'i');

  const kindRe = kind === 'core' ? /\b(core|cpu)\b/i : /\bram\b/i;
  const wantGroup = kind === 'core' ? 'CPU' : 'RAM';

  const matches = (s: any): boolean => {
    const d = s.description ?? '';
    // C2D and C2 share the "c2" token; M1 collides with M2/M3/M4.
    if (isC2 && /\bc2d\b/i.test(d)) return false;
    if (isM1 && /\b(m2|m3|m4)\b/i.test(d)) return false;
    if (!famRe.test(d) || !isOnDemand(d) || !inRegion(s)) return false;

    const group = s.category?.resourceGroup;
    return group === 'CPU' || group === 'RAM' ? group === wantGroup : kindRe.test(d);
  };

  // Prefer an exact-region SKU over a multi-region "Americas" one when both
  // exist, so the rate is the most specific available for REGION.
  const candidates = skus.filter(matches);
  if (candidates.length === 0) return null;
  const exact = candidates.find((s) => (s.serviceRegions ?? []).includes(REGION));
  return skuPrice(exact ?? candidates[0]);
}

// Matches e.g. "Nvidia Tesla A100 GPU running in Americas" / "Nvidia L4 GPU ...".
function findGpuRate(skus: any[], modelRe: RegExp): number | null {
  const pick = skus.find((s) => {
    const d = s.description ?? '';
    return modelRe.test(d) && /gpu/i.test(d) && isOnDemand(d) && inRegion(s);
  });
  return pick ? skuPrice(pick) : null;
}

export async function fetchGcpComputeRates(apiKey: string): Promise<GcpComputeRates> {
  const service = await findGcpServiceName('Compute Engine', apiKey);
  const skus = await fetchAllSkus(service, apiKey);

  const families = new Map<string, { core: number; ram: number }>();
  for (const f of FAMILIES) {
    const core = findFamilyRate(skus, f, 'core');
    const ram = findFamilyRate(skus, f, 'ram');
    if (core != null && ram != null) families.set(f, { core, ram });
  }

  const gpus = new Map<string, number>();
  const a100 = findGpuRate(skus, /a100/i);
  const l4 = findGpuRate(skus, /\bl4\b/i);
  if (a100 != null) gpus.set('a100', a100);
  if (l4 != null) gpus.set('l4', l4);

  const matched = [...families.keys()];
  const missing = FAMILIES.filter((f) => !families.has(f));
  console.log(
    `🔍 GCP compute rates: families matched [${matched.join(',') || 'none'}], missing [${missing.join(',') || 'none'}]; a100=${a100}, l4=${l4} (region ${REGION})`,
  );

  // Any gap → dump the real candidate SKU names so the matcher can be fixed.
  if (missing.length > 0 || a100 == null || l4 == null) {
    const NOISE = /commitment|committed|spot|preemptible|sole ?tenan|network|transfer|storage|snapshot|image|license|premium|ip address/i;
    const cand = skus.filter((s) => {
      const d = s.description ?? '';
      return (/instance (core|ram)/i.test(d) || /gpu/i.test(d)) && !NOISE.test(d);
    });
    console.log(`🔍 ${skus.length} total Compute Engine SKUs; ${cand.length} core/ram/gpu candidates:`);
    cand.slice(0, 80).forEach((s) => console.log(`   - [${(s.serviceRegions ?? []).join(',')}] ${s.description}`));
  }

  return { families, gpus };
}

// 'a2-highgpu-1g' → 'a2', 'e2-standard-4' → 'e2'
export function gcpFamilyOf(instanceType: string): string {
  return instanceType.split('-')[0].toLowerCase();
}

// GPU device model for a GPU-bundled family, or null for CPU-only families.
export function gcpGpuModelOf(family: string): string | null {
  if (family === 'a2') return 'a100';
  if (family === 'g2') return 'l4';
  return null;
}
