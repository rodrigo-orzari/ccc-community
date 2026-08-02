// Oracle Cloud Infrastructure (OCI) live price list.
//
// Oracle has no officially documented public pricing API, but its own web-based
// Cost Estimator calls this endpoint client-side (no auth, no API key) — it has
// been stable and used by community tooling since 2021:
// https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/
//
// The feed is a flat list of ~650 metered line items (one per billing
// dimension — e.g. "Compute - Standard - E5 - OCPU" and
// "Compute - Standard - E5 - Memory" are two separate items for one VM
// family), not one row per sellable product. Callers match items by
// `serviceCategory` + `displayName` substring and combine metered dimensions
// themselves (see fetchPricing() in pricing_pipeline.ts's OracleAdapter for
// the OCPU + Memory → hourly VM price example).
//
// Since Oracle doesn't document this feed formally, treat it like any scraped
// source: cache the response for the lifetime of one pipeline run, and let
// callers fall back to their static config if a match isn't found.

import axios from 'axios';

export interface OracleProduct {
  partNumber: string;
  displayName: string;
  metricName: string;
  serviceCategory: string;
  currencyCodeLocalizations: {
    currencyCode: string;
    prices: { model: string; value: number }[];
  }[];
}

const CETOOLS_URL = 'https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/?currencyCode=USD';

let cachedCatalog: OracleProduct[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // one pipeline run rarely spans 10 minutes

export async function fetchOracleCatalog(): Promise<OracleProduct[]> {
  const now = Date.now();
  if (cachedCatalog && now - cachedAt < CACHE_TTL_MS) return cachedCatalog;

  const response = await axios.get(CETOOLS_URL, { timeout: 30000 });
  const items: OracleProduct[] = response.data?.items ?? [];
  if (items.length === 0) throw new Error('OCI cetools price list returned 0 items');

  cachedCatalog = items;
  cachedAt = now;
  return items;
}

// Returns the PAY_AS_YOU_GO USD price for the first item matching `predicate`,
// or null if no item matches or it has no usable price.
export function findPrice(
  catalog: OracleProduct[],
  predicate: (item: OracleProduct) => boolean
): number | null {
  const item = catalog.find(predicate);
  if (!item) return null;
  const usd = item.currencyCodeLocalizations.find(c => c.currencyCode === 'USD');
  const payg = usd?.prices.find(p => p.model === 'PAY_AS_YOU_GO');
  if (!payg || typeof payg.value !== 'number' || payg.value <= 0) return null;
  return payg.value;
}

export function nameIncludes(item: OracleProduct, ...substrings: string[]): boolean {
  const dn = item.displayName.toLowerCase();
  return substrings.every(s => dn.includes(s.toLowerCase()));
}
