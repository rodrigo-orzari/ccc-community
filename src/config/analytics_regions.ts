// Regional expansion for Data & Analytics pricing.
//
// Analytics adapters emit one record per SKU priced from a single US reference
// region. To give the Data & Analytics category real geographic coverage (so a
// user can compare providers within W. Europe, Asia Pacific, etc.), each SKU is
// replicated across the regions below and its price scaled by `mult` relative to
// the provider's US reference region (mult 1.00).
//
// Multipliers are approximate public regional pricing deltas — the same modeling
// approach used for App Hosting (see src/config/app_hosting.ts). They are NOT exact
// per-SKU quotes; Oracle and DigitalOcean publish uniform global pricing (mult 1.00).

export interface AnalyticsRegion {
  region: string;
  geography: string;
  mult: number;
}

export const ANALYTICS_REGIONS: Record<string, AnalyticsRegion[]> = {
  aws: [
    { region: 'us-east-1',       geography: 'N. America',   mult: 1.00 },
    { region: 'eu-west-1',       geography: 'W. Europe',    mult: 1.08 },
    { region: 'ap-southeast-1',  geography: 'Asia Pacific', mult: 1.10 },
    { region: 'sa-east-1',       geography: 'S. America',   mult: 1.28 },
    { region: 'ap-southeast-2',  geography: 'Australia',    mult: 1.18 },
  ],
  azure: [
    { region: 'eastus',          geography: 'N. America',   mult: 1.00 },
    { region: 'westeurope',      geography: 'W. Europe',    mult: 1.08 },
    { region: 'southeastasia',   geography: 'Asia Pacific', mult: 1.06 },
    { region: 'brazilsouth',     geography: 'S. America',   mult: 1.32 },
    { region: 'australiaeast',   geography: 'Australia',    mult: 1.17 },
  ],
  gcp: [
    { region: 'us-central1',           geography: 'N. America',   mult: 1.00 },
    { region: 'europe-west1',          geography: 'W. Europe',    mult: 1.08 },
    { region: 'asia-southeast1',       geography: 'Asia Pacific', mult: 1.09 },
    { region: 'southamerica-east1',    geography: 'S. America',   mult: 1.15 },
    { region: 'australia-southeast1',  geography: 'Australia',    mult: 1.12 },
  ],
  // Oracle publishes uniform global list pricing.
  oracle: [
    { region: 'us-ashburn-1',    geography: 'N. America',   mult: 1.00 },
    { region: 'eu-frankfurt-1',  geography: 'W. Europe',    mult: 1.00 },
    { region: 'ap-singapore-1',  geography: 'Asia Pacific', mult: 1.00 },
    { region: 'sa-saopaulo-1',   geography: 'S. America',   mult: 1.00 },
    { region: 'ap-sydney-1',     geography: 'Australia',    mult: 1.00 },
  ],
  // DigitalOcean publishes uniform global pricing (no S. America analytics region).
  digitalocean: [
    { region: 'nyc3', geography: 'N. America',   mult: 1.00 },
    { region: 'ams3', geography: 'W. Europe',    mult: 1.00 },
    { region: 'sgp1', geography: 'Asia Pacific', mult: 1.00 },
    { region: 'syd1', geography: 'Australia',    mult: 1.00 },
  ],
  alibaba: [
    { region: 'us-east-1',       geography: 'N. America',   mult: 1.00 },
    { region: 'eu-central-1',    geography: 'W. Europe',    mult: 1.05 },
    { region: 'ap-southeast-1',  geography: 'Asia Pacific', mult: 1.00 },
    { region: 'ap-southeast-2',  geography: 'Australia',    mult: 1.10 },
  ],
};
