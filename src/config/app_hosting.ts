/**
 * Multi-Region App Hosting (PaaS) Config
 *
 * Services: Azure App Service, AWS App Runner / Lightsail / Amplify,
 * GCP App Engine, DigitalOcean App Platform, Oracle WebLogic, Alibaba Web+.
 *
 * Structure: base rows (N. America reference price) × per-region multiplier.
 * Multipliers are derived from each provider's published regional pricing pages.
 * Providers with globally-uniform pricing (AWS, DigitalOcean, Oracle) use 1.0x everywhere.
 */

type Row = {
  type: string;
  vcpus: number;
  memory_gb: number;
  price: number;
  unit: string;
  attributes: { os: string; tier: string; compute_type: string; runtime?: string };
};

export interface AppHostingRegion {
  region: string;
  geography: string;
  rows: Row[];
}

function applyMultiplier(rows: Row[], mult: number): Row[] {
  return rows.map(r => ({
    ...r,
    price: r.price === 0 ? 0 : Math.round(r.price * mult * 100) / 100,
  }));
}

// ─── Azure App Service ────────────────────────────────────────────────────────
// Regional multipliers: East US = 1.0x reference.
// Source: azure.microsoft.com/en-us/pricing/details/app-service/linux/
const AZURE_BASE: Row[] = [
  { type: 'App Service Free F1',      vcpus: 1, memory_gb: 1,    price: 0,      unit: 'Mo', attributes: { os: 'Linux', tier: 'Free',     compute_type: 'Shared' } },
  { type: 'App Service Basic B1',     vcpus: 1, memory_gb: 1.75, price: 54.75,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',    compute_type: 'Dedicated' } },
  { type: 'App Service Basic B2',     vcpus: 2, memory_gb: 3.5,  price: 109.50, unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',    compute_type: 'Dedicated' } },
  { type: 'App Service Standard S1',  vcpus: 1, memory_gb: 1.75, price: 73.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Dedicated' } },
  { type: 'App Service Premium P1v3', vcpus: 2, memory_gb: 8,    price: 164.25, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Dedicated' } },
  { type: 'App Service Premium P2v3', vcpus: 4, memory_gb: 16,   price: 328.50, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Dedicated' } },
  { type: 'App Service Premium P3v3', vcpus: 8, memory_gb: 32,   price: 657.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Dedicated' } },
  { type: 'Static Web Apps Standard', vcpus: 0, memory_gb: 0,    price: 9.00,   unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Shared' } },
];

const AZURE_REGIONS = [
  { region: 'eastus',          geography: 'N. America',     mult: 1.00 },
  { region: 'brazilsouth',     geography: 'S. America',     mult: 1.32 },
  { region: 'westeurope',      geography: 'W. Europe',      mult: 1.08 },
  { region: 'southeastasia',   geography: 'Asia Pacific',   mult: 1.04 },
  { region: 'australiaeast',   geography: 'Australia',      mult: 1.17 },
];

export const AZURE_APP_HOSTING_REGIONS: AppHostingRegion[] = AZURE_REGIONS.map(r => ({
  region: r.region,
  geography: r.geography,
  rows: applyMultiplier(AZURE_BASE, r.mult),
}));

// ─── AWS App Runner / Lightsail / Amplify ────────────────────────────────────
// App Runner pricing is uniform across all supported regions.
// Source: aws.amazon.com/apprunner/pricing/
const AWS_BASE: Row[] = [
  { type: 'App Runner 0.25vCPU/0.5GB',    vcpus: 1, memory_gb: 0.5, price: 11.70,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',    compute_type: 'Dedicated' } },
  { type: 'App Runner 1vCPU/2GB',         vcpus: 1, memory_gb: 2,   price: 46.80,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Dedicated' } },
  { type: 'App Runner 2vCPU/4GB',         vcpus: 2, memory_gb: 4,   price: 93.60,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Dedicated' } },
  { type: 'App Runner 4vCPU/8GB',         vcpus: 4, memory_gb: 8,   price: 187.20, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Dedicated' } },
  { type: 'Lightsail Containers Nano',    vcpus: 1, memory_gb: 0.5, price: 7.00,   unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',    compute_type: 'Shared' } },
  { type: 'Lightsail Containers Small',   vcpus: 1, memory_gb: 2,   price: 20.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Shared' } },
  { type: 'Amplify Hosting Build+Serve',  vcpus: 0, memory_gb: 0,   price: 13.10,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Shared', runtime: 'Static + SSR' } },
];

const AWS_REGIONS = [
  { region: 'us-east-1',      geography: 'N. America',   mult: 1.00 },
  { region: 'sa-east-1',      geography: 'S. America',   mult: 1.00 },
  { region: 'eu-west-1',      geography: 'W. Europe',    mult: 1.00 },
  { region: 'ap-southeast-1', geography: 'Asia Pacific', mult: 1.00 },
  { region: 'ap-southeast-2', geography: 'Australia',    mult: 1.00 },
];

export const AWS_APP_HOSTING_REGIONS: AppHostingRegion[] = AWS_REGIONS.map(r => ({
  region: r.region,
  geography: r.geography,
  rows: applyMultiplier(AWS_BASE, r.mult),
}));

// ─── GCP App Engine ────────────────────────────────────────────────────────────
// Source: cloud.google.com/appengine/pricing
const GCP_BASE: Row[] = [
  { type: 'App Engine Standard F1 (Free)', vcpus: 1, memory_gb: 0.128, price: 0,      unit: 'Mo', attributes: { os: 'Linux', tier: 'Free',     compute_type: 'Shared' } },
  { type: 'App Engine Standard F2',        vcpus: 1, memory_gb: 0.256, price: 36.50,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',    compute_type: 'Shared' } },
  { type: 'App Engine Standard F4',        vcpus: 1, memory_gb: 0.512, price: 73.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Shared' } },
  { type: 'App Engine Standard F4_1G',     vcpus: 1, memory_gb: 1,     price: 109.50, unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Shared' } },
  { type: 'App Engine Flex 1vCPU/2GB',     vcpus: 1, memory_gb: 2,     price: 50.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Dedicated' } },
  { type: 'App Engine Flex 2vCPU/4GB',     vcpus: 2, memory_gb: 4,     price: 85.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Dedicated' } },
  { type: 'Firebase Hosting',              vcpus: 0, memory_gb: 0,     price: 0.026,  unit: 'per GB transferred', attributes: { os: 'Linux', tier: 'Free',   compute_type: 'Shared', runtime: 'Static' } },
];

const GCP_REGIONS = [
  { region: 'us-central1',             geography: 'N. America',   mult: 1.00 },
  { region: 'southamerica-east1',      geography: 'S. America',   mult: 1.15 },
  { region: 'europe-west1',            geography: 'W. Europe',    mult: 1.08 },
  { region: 'asia-southeast1',         geography: 'Asia Pacific', mult: 1.09 },
  { region: 'australia-southeast1',    geography: 'Australia',    mult: 1.12 },
];

export const GCP_APP_HOSTING_REGIONS: AppHostingRegion[] = GCP_REGIONS.map(r => ({
  region: r.region,
  geography: r.geography,
  rows: applyMultiplier(GCP_BASE, r.mult),
}));

// ─── DigitalOcean App Platform ────────────────────────────────────────────────
// Pricing is uniform across all DO regions.
// Source: docs.digitalocean.com/products/app-platform/
const DO_BASE: Row[] = [
  { type: 'App Platform Static',          vcpus: 0, memory_gb: 0,   price: 0,     unit: 'Mo', attributes: { os: 'Linux', tier: 'Free',         compute_type: 'Shared' } },
  { type: 'App Platform Basic XXS',       vcpus: 1, memory_gb: 0.5, price: 5.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',        compute_type: 'Shared' } },
  { type: 'App Platform Basic XS',        vcpus: 1, memory_gb: 1,   price: 10.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',        compute_type: 'Shared' } },
  { type: 'App Platform Professional XS', vcpus: 1, memory_gb: 2,   price: 20.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Professional', compute_type: 'Dedicated' } },
  { type: 'App Platform Professional S',  vcpus: 2, memory_gb: 4,   price: 40.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Professional', compute_type: 'Dedicated' } },
  { type: 'App Platform Professional M',  vcpus: 4, memory_gb: 8,   price: 80.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Professional', compute_type: 'Dedicated' } },
];

const DO_REGIONS = [
  { region: 'nyc1', geography: 'N. America',   mult: 1.00 },
  { region: 'ams3', geography: 'W. Europe',    mult: 1.00 },
  { region: 'sgp1', geography: 'Asia Pacific', mult: 1.00 },
  { region: 'syd1', geography: 'Australia',    mult: 1.00 },
];

export const DO_APP_HOSTING_REGIONS: AppHostingRegion[] = DO_REGIONS.map(r => ({
  region: r.region,
  geography: r.geography,
  rows: applyMultiplier(DO_BASE, r.mult),
}));

// ─── Cloudflare Pages / Workers ───────────────────────────────────────────────
// Cloudflare hosts apps on a global anycast edge network — pricing is uniform
// worldwide (no per-region multiplier) and billed per-plan rather than per vCPU.
// Source: cloudflare.com/plans/developer-platform/, developers.cloudflare.com/workers/platform/pricing/
const CLOUDFLARE_BASE: Row[] = [
  { type: 'Pages (Free)',          vcpus: 0, memory_gb: 0, price: 0,     unit: 'Mo', attributes: { os: 'Linux', tier: 'Free',     compute_type: 'Shared',     runtime: 'Static + Functions' } },
  { type: 'Workers Paid',          vcpus: 0, memory_gb: 0, price: 5.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Serverless', runtime: 'Workers + Pages' } },
  { type: 'Workers for Platforms', vcpus: 0, memory_gb: 0, price: 25.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Serverless', runtime: 'Multi-tenant' } },
];
export const CLOUDFLARE_APP_HOSTING_REGIONS: AppHostingRegion[] = [
  { region: 'global', geography: 'Global', rows: CLOUDFLARE_BASE },
];

// ─── Oracle WebLogic ──────────────────────────────────────────────────────────
// WebLogic is licensed software; pricing is uniform across OCI regions.
// Source: oracle.com/cloud/price-list/
const ORACLE_BASE: Row[] = [
  { type: 'WebLogic Server SE',    vcpus: 2, memory_gb: 15, price: 105.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard', compute_type: 'Dedicated' } },
  { type: 'WebLogic Server EE',    vcpus: 2, memory_gb: 15, price: 252.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Dedicated' } },
  { type: 'WebLogic Server Suite', vcpus: 4, memory_gb: 30, price: 720.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',  compute_type: 'Dedicated' } },
];

const ORACLE_REGIONS = [
  { region: 'us-ashburn-1',   geography: 'N. America',   mult: 1.00 },
  { region: 'sa-saopaulo-1',  geography: 'S. America',   mult: 1.00 },
  { region: 'eu-frankfurt-1', geography: 'W. Europe',    mult: 1.00 },
  { region: 'ap-singapore-1', geography: 'Asia Pacific', mult: 1.00 },
  { region: 'ap-sydney-1',    geography: 'Australia',    mult: 1.00 },
];

export const ORACLE_APP_HOSTING_REGIONS: AppHostingRegion[] = ORACLE_REGIONS.map(r => ({
  region: r.region,
  geography: r.geography,
  rows: applyMultiplier(ORACLE_BASE, r.mult),
}));

// ─── Alibaba Web+ / Simple App Server ────────────────────────────────────────
// Source: alibabacloud.com/product/web-hosting
const ALIBABA_BASE: Row[] = [
  { type: 'Simple App Server 1C1G',  vcpus: 1, memory_gb: 1, price: 3.50,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Basic',        compute_type: 'Shared' } },
  { type: 'Simple App Server 2C2G',  vcpus: 2, memory_gb: 2, price: 9.00,  unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard',     compute_type: 'Shared' } },
  { type: 'Simple App Server 2C4G',  vcpus: 2, memory_gb: 4, price: 18.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard',     compute_type: 'Shared' } },
  { type: 'Simple App Server 4C8G',  vcpus: 4, memory_gb: 8, price: 36.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Standard',     compute_type: 'Shared' } },
  { type: 'Web+ Standard',           vcpus: 2, memory_gb: 4, price: 42.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Professional', compute_type: 'Dedicated' } },
  { type: 'Web+ Premium',            vcpus: 4, memory_gb: 8, price: 84.00, unit: 'Mo', attributes: { os: 'Linux', tier: 'Premium',      compute_type: 'Dedicated' } },
];

const ALIBABA_REGIONS = [
  { region: 'cn-hangzhou',   geography: 'Asia Pacific', mult: 1.00 },
  { region: 'us-east-1',     geography: 'N. America',   mult: 1.05 },
  { region: 'eu-central-1',  geography: 'W. Europe',    mult: 1.10 },
  { region: 'ap-southeast-1',geography: 'Asia Pacific', mult: 1.00 },
  { region: 'ap-southeast-2',geography: 'Australia',    mult: 1.10 },
];

export const ALIBABA_APP_HOSTING_REGIONS: AppHostingRegion[] = ALIBABA_REGIONS.map(r => ({
  region: r.region,
  geography: r.geography,
  rows: applyMultiplier(ALIBABA_BASE, r.mult),
}));

// ─── Legacy single-region exports (kept for backward compatibility) ───────────
export const AZURE_APP_HOSTING   = AZURE_APP_HOSTING_REGIONS[0].rows;
export const AWS_APP_HOSTING     = AWS_APP_HOSTING_REGIONS[0].rows;
export const GCP_APP_HOSTING     = GCP_APP_HOSTING_REGIONS[0].rows;
export const DO_APP_HOSTING      = DO_APP_HOSTING_REGIONS[0].rows;
export const ORACLE_APP_HOSTING  = ORACLE_APP_HOSTING_REGIONS[0].rows;
export const ALIBABA_APP_HOSTING = ALIBABA_APP_HOSTING_REGIONS[0].rows;
