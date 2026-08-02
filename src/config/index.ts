import type { SponsorSlot } from '@/types';

// Geographic regions
export const GEOGRAPHIES = ['N. America', 'S. America', 'W. Europe', 'N. Europe', 'Mid East & Africa', 'Asia Pacific', 'Australia'];

// VM-specific constants
export const OS_TYPES = ['Linux', 'Windows'];
// Three CPU filter options. Each maps to one or more underlying cpu_vendor
// values stored on the records. ARM covers both AWS Graviton and Ampere Altra,
// so selecting it surfaces both in the results (the table still shows the
// specific chip — Graviton / Ampere — see PricingTable's vendor display).
export const CPU_PROFILES = [
  { id: 'intel', label: 'Intel', vendors: ['Intel'], arch: 'x86 64' },
  { id: 'amd', label: 'AMD', vendors: ['AMD'], arch: 'x86 64' },
  { id: 'arm', label: 'ARM', vendors: ['AWS', 'Ampere'], arch: 'ARM' },
];
export const CATEGORIES = ['General purpose', 'Compute optimized', 'Memory optimized', 'Storage optimized', 'Burstable', 'HPC'];
// No PRICING_MODELS facet: the site carries on-demand (pay-as-you-go) rates only,
// so there is nothing for a visitor to choose between. Spot/preemptible, reserved
// and committed-use rates are excluded at ingest (see gcp_compute_rates.ts and
// pricing_pipeline.ts) rather than filtered at query time.

// GPU Compute-specific constants. No static default list — GPU_MODELS and
// GPU_VENDORS are entirely derived from ingested data (see gpu_models/
// gpu_vendors facets in useDynamicFilters / src/config/gpu_models.ts
// classifiers) so the filters only ever offer values we actually have priced.
export const GPU_MODELS: string[] = [];
export const GPU_VENDORS: string[] = [];

// Database-specific constants
export const DB_FAMILIES = ['Relational', 'NoSQL', 'Vector'];
export const DB_FAMILY_MAPPINGS: Record<string, string[]> = {
  'Relational': ['PostgreSQL', 'MySQL', 'MariaDB', 'SQL Server', 'Oracle DB'],
  'NoSQL': ['Cosmos DB', 'MongoDB', 'Redis', 'Valkey', 'DB2'],
  'Vector': ['Pinecone', 'Milvus', 'Qdrant', 'Weaviate', 'Chroma']
};
export const DB_ENGINES = ['PostgreSQL', 'MySQL', 'MariaDB', 'SQL Server', 'Oracle DB', 'Cosmos DB', 'MongoDB', 'Redis', 'Valkey', 'DB2', 'Pinecone', 'Milvus', 'Qdrant', 'Weaviate', 'Chroma'];
export const DEPLOYMENT_TYPES = ['Provisioned', 'Serverless'];
// Verified against live data (2026-07-19): only Single AZ / Multi AZ are ever written.
// Zone Redundant / Multi Region / Geo Redundant were never produced by any pipeline.
export const HA_MODES = ['Single AZ', 'Multi AZ'];

// Serverless-specific constants
export const SERVERLESS_LANGUAGES = ['Python', 'Node', 'Go', 'Java', 'C#', 'Ruby', 'JavaScript', 'PHP', 'Rust', 'PowerShell', 'TypeScript', 'Any'];
export const SERVERLESS_COLD_START_OPTIONS = ['<100 ms', '100-200 ms', '>200 ms'];
export const DEFAULT_SERVERLESS_TIMEOUT_RANGE = { min: 0, max: 3600 };
export const SERVERLESS_MEMORY_CONFIG_OPTIONS = ['Configurable', 'Tiers', 'Automatic'];
export const SERVERLESS_FREE_TIER_OPTIONS = ['Yes', 'No'];
export const SERVERLESS_GRANULARITY_OPTIONS = ['1', '100'];
export const SERVERLESS_EXECUTION_MODEL_OPTIONS = ['Both', 'Code (ZIP)', 'Container Image'];
export const SERVERLESS_PROVISIONED_CONCURRENCY_OPTIONS = ['Yes', 'No'];
export const SERVERLESS_EPHEMERAL_STORAGE_OPTIONS = ['< 1', '1 - 5', '> 5'];
// Memory-size buckets (GB). Serverless rows span ~0.125 GB → 10 GB, so the shared
// 0–3200 GB spec slider is useless here; these buckets map to memory_gb ranges in api-utils.

// CPU architecture. AWS Lambda is split x86 (Intel/AMD) vs ARM (Graviton); maps to pr.arch.
export const SERVERLESS_ARCHITECTURES = ['x86', 'ARM'];
// Service-type categorization for the Serverless tab. Verified against live data
// (2026-07-19): rows are tagged 'Compute' (the vast majority) or 'Container' (Azure
// Container Apps). API Gateway, Messaging, Eventing, and Workflow live under the
// separate Integration category (src/config/integration.ts) with their own
// INTEGRATION_SERVICES filter and were never actually merged into the serverless
// query, so those four were removed as dead options. See OPEN_DECISIONS.md.
export const SERVERLESS_SERVICE_TYPES = ['Compute', 'Container'];

// Containers-specific constants
// Verified against live data (2026-07-19): 'Docker' is never written as an orchestrator.
export const CONTAINERS_ORCHESTRATORS = ['Kubernetes', 'Serverless'];
export const CONTAINERS_COMPUTE_TYPES = ['Serverless', 'Provisioned', 'Managed Kubernetes'];
export const CONTAINERS_ARCHITECTURES = ['x86', 'ARM'];
// '100ms' covers sub-second-billed serverless container platforms (e.g. Cloud Run).
export const CONTAINERS_BILLING_GRANULARITY = ['100ms', 'Second', 'Hour'];

// Container Registry-specific constants (subsection within Containers)
export const REGISTRY_SERVICE_TYPES = ['Storage', 'Data Transfer', 'Operations'];
// Pricing component breakdown: what gets billed and how (per GB/month for storage, per GB for transfer, per operation for API calls)
export const REGISTRY_PRICING_COMPONENTS = ['Storage (per GB/month)', 'Data Transfer (per GB)', 'API Operations'];

// Networking-specific constants
export const NETWORKING_SERVICES = ['Data Transfer', 'Content Delivery Network', 'Virtual Private Cloud', 'Load Balancing', 'Dedicated Connection', 'Public IPv4', 'NAT Gateway', 'VPN Gateway', 'API Gateway'];
// Display-only grouping for the Service filter chips. Every NETWORKING_SERVICES
// entry must appear in exactly one group. Filtering logic still uses the flat list.
export const NETWORKING_SERVICE_GROUPS: { label: string; services: string[] }[] = [
  { label: 'Core & Transfer', services: ['Data Transfer', 'Virtual Private Cloud'] },
  { label: 'Connectivity & Gateways', services: ['VPN Gateway', 'NAT Gateway', 'Dedicated Connection', 'API Gateway'] },
  { label: 'Delivery & Addressing', services: ['Load Balancing', 'Public IPv4', 'Content Delivery Network'] },
];
export const NETWORKING_CONNECTION_TYPES = ['Multipoint', 'Point-to-Point'];
export const NETWORKING_ROUTING_TYPES = ['Dynamic', 'Fixed'];
export const NETWORKING_HA_SUPPORT = ['Yes', 'No'];
export const NETWORKING_VPC_SUPPORT = ['Yes', 'No'];
export const NETWORKING_DIRECTIONS = ['Egress', 'Ingress', 'Intra-Cloud'];
export const NETWORKING_BILLING_MODELS = ['Hourly Uptime', 'Data Processed (GB)', 'Per Endpoint/Tunnel', 'Included'];
// 'Unlimited' covers Cloudflare's CDN tiers.
export const NETWORKING_USAGE_TIERS = ['Flat Rate', 'First 10TB', '10TB - 50TB', 'Over 10TB', 'Over Allowance', 'Included', 'Unlimited'];
// Verified against live data (2026-07-19): '> 10 Gbps' is never written.
export const NETWORKING_PORT_CAPACITIES = ['< 1 Gbps', '1 Gbps - 10 Gbps', 'N/A'];
export const NETWORKING_TRANSFER_SCOPES = ['Same Region', 'Cross-AZ', 'Cross-Region', 'Internet', 'On-Premises', 'N/A'];



// Data Analytics-specific constants. Verified against live data (2026-07-19) — 'Native'
// was never written by any pipeline (dead), and several real engines were missing
// entirely (warehouse: BigQuery, Redshift, Synapse, Microsoft Fabric; streaming:
// ApsaraMQ for Kafka, Event Hubs, Kinesis Data Streams, OCI Streaming, Pub/Sub).
export const ANALYTICS_ENGINES = [
  'Databricks',
  'Snowflake',
  'BigQuery',
  'Redshift',
  'Synapse',
  'Microsoft Fabric',
  'Oracle Analytics Cloud',
  'Oracle Autonomous Data Warehouse',
  'OpenSearch',
  'Kafka',
  'ApsaraMQ for Kafka',
  'Event Hubs',
  'Kinesis Data Streams',
  'OCI Streaming',
  'Pub/Sub',
  'MaxCompute',
  'E-MapReduce',
  'Hologres',
  'AnalyticDB for MySQL',
];
export const ANALYTICS_DEPLOYMENT_TYPES = ['Serverless', 'Provisioned'];
// 'Capacity F*' tiers cover Microsoft Fabric's capacity-based pricing.
export const ANALYTICS_TIERS = [
  'Standard',
  'Standard Edition',
  'Premium',
  'Enterprise',
  'Enterprise Edition',
  'Enterprise Plus',
  'Business Critical',
  'DC2 Node',
  'RA3 Node',
  'On-Demand',
  'Capacity F2',
  'Capacity F4',
  'Capacity F8',
  'Capacity F16',
  'Capacity F32',
  'Capacity F64',
];

// Range defaults. Maxes are set with headroom above the largest real vCPU/memory
// values found across the static config + live-adapter data (checked 2026-07-18).
export const DEFAULT_VCPU_RANGE = { min: 0, max: 320 };
export const DEFAULT_MEMORY_RANGE = { min: 0, max: 4000 }; // real max 3844 GB
export const DEFAULT_SERVERLESS_VCPU_RANGE = { min: 0, max: 16 };
export const DEFAULT_SERVERLESS_MEMORY_RANGE = { min: 0, max: 32 };
export const DEFAULT_CONTAINERS_VCPU_RANGE = { min: 0, max: 256 }; // real max 208 vcpus
export const DEFAULT_CONTAINERS_MEMORY_RANGE = { min: 0, max: 6000 }; // real max 5888 GB
export const DEFAULT_PRICE_RANGE = { min: 0, max: 100 };
export const DEFAULT_GPU_COUNT_RANGE = { min: 0, max: 16 };

// Cloud providers with pricing data pipelines.
// To add a new pricing provider, add it here, create a config file (src/config/<provider>_*.ts),
// and register a pipeline adapter in the appropriate src/services/*_pipeline.ts file.
// providerType distinguishes the six general-purpose hyperscalers (offer
// compute/storage/networking primitives you build on) from specialized
// providers (single-purpose services: AI model vendors, vector databases,
// edge/security). Used to group provider filter buttons and summary cards
// in the UI so users don't see e.g. OpenAI presented as a peer of AWS.
export type ProviderType = 'hyperscaler' | 'specialized';

export const PROVIDERS: { id: string; name: string; color: string; soon?: boolean; providerType: ProviderType }[] = [
  { id: 'aws', name: 'AWS', color: '#FF9900', providerType: 'hyperscaler' },
  { id: 'azure', name: 'Azure', color: '#00BCFF', providerType: 'hyperscaler' },
  { id: 'gcp', name: 'Google', color: '#34A853', providerType: 'hyperscaler' },
  { id: 'oracle', name: 'Oracle', color: '#F80000', providerType: 'hyperscaler' },
  { id: 'digitalocean', name: 'DigitalOcean', color: '#0069FF', providerType: 'hyperscaler' },
  { id: 'alibaba', name: 'Alibaba', color: '#FF6A00', providerType: 'hyperscaler' },
  { id: 'openai', name: 'OpenAI', color: '#10A37F', providerType: 'specialized' },
  { id: 'anthropic', name: 'Anthropic', color: '#CC9D87', providerType: 'specialized' },
  { id: 'radium', name: 'Radium', color: '#7C3AED', providerType: 'specialized' },
  { id: 'pinecone', name: 'Pinecone', color: '#3B1CFF', providerType: 'specialized' },
  { id: 'milvus', name: 'Milvus', color: '#00D2D3', providerType: 'specialized' },
  { id: 'qdrant', name: 'Qdrant', color: '#FF004E', providerType: 'specialized' },
  { id: 'weaviate', name: 'Weaviate', color: '#2DCA73', providerType: 'specialized' },
  { id: 'chroma', name: 'Chroma', color: '#FF4F00', providerType: 'specialized' },
  { id: 'cloudflare', name: 'Cloudflare', color: '#F38020', providerType: 'specialized' },
];

// Providers that only belong to specific product categories. The six hyperscalers
// (aws/azure/gcp/oracle/digitalocean/alibaba) are intentionally omitted here,
// meaning "available in every category". A provider listed below only shows its
// filter button + summary card on the categories it actually offers. Keep this in
// sync with the ingest pipelines when a niche provider gains data in a new category.
export const PROVIDER_CATEGORY_SCOPE: Record<string, string[]> = {
  openai: ['ai'],
  anthropic: ['ai'],
  radium: ['ai'],
  pinecone: ['database'],
  milvus: ['database'],
  qdrant: ['database'],
  weaviate: ['database'],
  chroma: ['database'],
  cloudflare: ['networking', 'app-hosting', 'security'],
};

// Returns the providers applicable to a given product type. Filter buttons and the
// summary provider cards should only render these so users never see a provider
// (e.g. OpenAI on Virtual Machines) that can't appear in the current category.
export function providersForType(productType: string) {
  return PROVIDERS.filter(p => {
    const scope = PROVIDER_CATEGORY_SCOPE[p.id];
    return !scope || scope.includes(productType);
  });
}

/**
 * Display order for provider lists: hyperscalers first, then specialized
 * providers, alphabetical by display name within each group.
 *
 * Grouping comes first on purpose — a flat A-Z list interleaves Anthropic and
 * Chroma between AWS and Azure, which reads as though they're peers. They
 * aren't: one group sells general-purpose infrastructure, the other sells a
 * narrow service. The sidebar makes that split explicit with group headings;
 * the cards and summary table have no headings, so the ordering has to carry it.
 *
 * Sorted on `name` rather than `id` because the label is what users read
 * ("Google", not "gcp"), and localeCompare so casing and accents behave.
 *
 * Callers must copy before sorting — providersForType() returns a filtered view
 * over the shared PROVIDERS array, and an in-place sort would reorder it for
 * every other consumer.
 */
export function compareProvidersForDisplay(
  a: { name: string; providerType?: ProviderType },
  b: { name: string; providerType?: ProviderType }
): number {
  const rank = (t?: ProviderType) => (t === 'specialized' ? 1 : 0);
  const byGroup = rank(a.providerType) - rank(b.providerType);
  return byGroup !== 0 ? byGroup : a.name.localeCompare(b.name);
}

// AI-specific constants
export const AI_SERVICE_TYPES = ['Foundational Models', 'Embeddings'];
export const AI_MODEL_TIERS = ['Frontier', 'Standard', 'Efficient'];
// Model type/use case — split out from AI_MODEL_TIERS (2026-07-28) because the
// `modelTier` field on scraped rows used to carry both a genuine capability
// tier AND a modality label depending on data source, which polluted the
// "Model Tier" filter with values like 'Chat'/'Coding'/'Embedding'. See
// src/scrapers/ai_models/tier_inference.ts for where these values come from.
export const AI_MODALITIES = ['Chat', 'Coding', 'Embedding', 'Reranking', 'Image', 'Audio', 'Reasoning'];
export const AI_CONTEXT_WINDOWS = ['< 32K', '32K - 128K', '> 128K', '1M+'];
export const AI_MULTIMODAL_OPTIONS = ['Yes', 'No'];

// --- STORAGE ---
export const STORAGE_CATEGORIES: string[] = ['Object', 'Block', 'File', 'Archive'];
// 'High Performance' covers DigitalOcean's premium block storage tier.
export const STORAGE_TIERS: string[] = ['Standard', 'Infrequent', 'Cold', 'High Performance'];
export const STORAGE_REDUNDANCIES: string[] = ['Single-Zone', 'Zone-Redundant', 'Geo-Redundant'];
export const STORAGE_MEDIA: string[] = ['SSD', 'HDD'];

// --- APP HOSTING ---
export const APP_HOSTING_TIERS: string[] = ['Free', 'Basic', 'Standard', 'Premium', 'Professional'];
// 'Serverless' covers Cloudflare Workers-style compute (no dedicated/shared instance).
export const APP_HOSTING_COMPUTE_TYPES: string[] = ['Shared', 'Dedicated', 'Serverless'];

// --- INTEGRATION ---
export const INTEGRATION_SERVICES = ['Messaging', 'Eventing', 'API Gateway', 'Workflow'];
// 'Basic' covers DigitalOcean's entry-tier Managed Kafka SKU.
export const INTEGRATION_TIERS = ['Standard', 'Premium', 'Consumption', 'FIFO', 'Basic'];
// Billing model of an integration SKU (stored per record as attributes.pricing_model).
// usage = per-operation (per 1k/1M requests/events/ops/steps); data = per-GB/TB;
// flat = fixed monthly instance ('/mo'). Filter values are the stored lowercase keys.
export const INTEGRATION_PRICING_MODELS = ['usage', 'data', 'flat'];
export const INTEGRATION_PRICING_MODEL_LABELS: Record<string, string> = {
  usage: 'Usage-based',
  data: 'Data-based',
  flat: 'Flat (monthly)',
};
export const INTEGRATION_SIZES = ['256 KB', '1 MB', '4 MB', '10 MB', '100 MB'];
export const INTEGRATION_PROTOCOLS = ['REST', 'HTTP', 'SOAP', 'GraphQL'];

// --- SECURITY & IDENTITY ---
// Verified against live data (2026-07-19): Bot Management, SSL/TLS, and
// Zero Trust (Cloudflare) were real, priced rows with no filter option
// to find them — added below. Also: buildPricingFilters had no 'security' block at
// all, so the Security Service filter was a no-op regardless of options (fixed in
// api-utils.ts).
export const SECURITY_SERVICES = ['Web Application Firewall', 'Identity & Access Management (IAM)', 'Key Management Service (KMS)', 'DDoS Protection', 'Threat Detection', 'Bot Management', 'SSL/TLS', 'Zero Trust'];
export const SECURITY_SERVICE_GROUPS: { label: string; services: string[] }[] = [
  { label: 'Network Security', services: ['Web Application Firewall', 'DDoS Protection', 'Bot Management', 'Zero Trust', 'Threat Detection'] },
  { label: 'Identity & Encryption', services: ['Identity & Access Management (IAM)', 'Key Management Service (KMS)', 'SSL/TLS'] },
];

// --- SPONSORSHIP ---
// Site-wide sponsor slots (Datacenters page, Workloads listing page). Per-workload
// slots live on each entry in WORKLOADS (src/config/workloads.ts) via `sponsor`.
// Set to a SponsorSlot to go live; leave null and the page shows the "become a
// sponsor" pitch box instead. Image spec: 1200×200 (6:1) — see /docs "Advertising with us".
export const DATACENTERS_SPONSOR: SponsorSlot | null = null;
export const WORKLOADS_LISTING_SPONSOR: SponsorSlot | null = null;
export const CERTIFICATIONS_SPONSOR: SponsorSlot | null = null;
export const STATUS_SPONSOR: SponsorSlot | null = null;
