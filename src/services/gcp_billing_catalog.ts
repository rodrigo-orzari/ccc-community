import axios from 'axios';

// Low-level GCP Cloud Billing Catalog API client helpers, extracted into their
// own leaf module (depends only on axios). This deliberately has NO dependency
// on pricing_pipeline / BaseAdapter: both serverless_adapters_live.ts and
// gcp_compute_rates.ts need these helpers, and having gcp_compute_rates import
// them from serverless_adapters_live created a circular import
// (pricing_pipeline → gcp_compute_rates → serverless_adapters_live →
// pricing_pipeline) that crashed module init with a temporal-dead-zone
// "Cannot access 'BaseAdapter' before initialization" at build time.

// Resolve a Billing Catalog service resource name (e.g. "services/6F81-...")
// from its displayName ("Cloud Run", "Compute Engine").
export async function findGcpServiceName(displayName: string, apiKey: string): Promise<string> {
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = `https://cloudbilling.googleapis.com/v1/services?key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await axios.get(url, { timeout: 30000 });
    const services: any[] = response.data?.services ?? [];
    const match = services.find(s => s.displayName === displayName);
    if (match) return match.name;
    pageToken = response.data?.nextPageToken;
    if (!pageToken) break;
  }
  throw new Error(`GCP service "${displayName}" not found in Billing Catalog services.list`);
}

export async function fetchAllSkus(serviceName: string, apiKey: string): Promise<any[]> {
  const skus: any[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = `https://cloudbilling.googleapis.com/v1/${serviceName}/skus?key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await axios.get(url, { timeout: 30000 });
    skus.push(...(response.data?.skus ?? []));
    pageToken = response.data?.nextPageToken;
    if (!pageToken) break;
  }
  return skus;
}
