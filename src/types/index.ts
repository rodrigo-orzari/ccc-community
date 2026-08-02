export type ProductType = 'vm' | 'gpu' | 'database' | 'serverless' | 'containers' | 'networking' | 'storage' | 'data-analytics' | 'ai' | 'app-hosting' | 'security' | 'integration';

export interface PricingRecord {
  provider: string;
  service: string;
  region: string;
  instance_type: string;
  vcpus: number;
  memory_gb: number;
  arch: string;
  os: string;
  cpu_vendor: string;
  gpu_count: number;
  geography: string;
  category: string;
  price_per_unit: string;
  previous_price_per_unit?: string | null;
  unit: string;
  min_price?: string;
  avg_price?: string;
  max_price?: string;
  data_source?: string;
  updated_at?: string;
  attributes?: {
    supportedLanguages?: string | string[];
    engine?: string;
    engine_version?: string;
    deployment_type?: string;
    ha_mode?: string;
    service_type?: string;
    storage_type?: string;
    redundancy?: string;
    media?: string;
    workload?: string;
    tier?: string;
    cold_start_overhead_ms?: string | number;
    timeout_seconds?: string | number;
    memory_configuration?: string;
    free_invocations_per_month?: string | number;
    billing_granularity_ms?: number | string;
    invocation_price_per_1m?: number | string;
    execution_model?: string;
    provisioned_concurrency_support?: string;
    max_ephemeral_storage_gb?: number | string;
    orchestrator?: string;
    compute_type?: string;
    architecture?: string;
    billing_granularity?: string;
    transfer_tier?: string;
    destination?: string;
    included_transfer?: string;
    modelTier?: string;
    modality?: string;
    contextWindowK?: number | string;
    multimodal?: string;
    outputPricePer1M?: number | string;
    trainingCutoff?: string;
    billing_model?: string;
    usage_tier?: string;
    port_capacity?: string;
    transfer_scope?: string;
    max_message_size_kb?: string | number;
    protocols?: string;
    // Integration comparability (see src/config/integration.ts):
    pricing_model?: 'usage' | 'data' | 'flat';
    normalized_price_per_1m?: number | null;
    // GPU Compute (see src/config/gpu_models.ts) — model name is derived from
    // instance-type naming (no pricing API exposes it directly); vram_gb is
    // per-GPU, preferring a provider's live memory field when available.
    gpu_model?: string;
    gpu_vendor?: string;
    gpu_vram_gb?: number | string;
  };
}

// Workloads are configured by intent, not bespoke numeric params: four
// universal sliders anchored on the AWS Well-Architected pillars. Cost is the
// OUTPUT — there is no cost slider. Each workload interprets these into concrete
// component requirements via the shared helpers in config/workload_priorities.ts.
export type PriorityLevel = 'low' | 'medium' | 'high';

export interface WorkloadPriorities {
  capacity: PriorityLevel;     // magnitude — how big (users / throughput / data volume)
  performance: PriorityLevel;  // speed — instance class, storage media, caching
  reliability: PriorityLevel;  // redundancy — HA mode, replicas, backups, load balancing
  security: PriorityLevel;     // hardening — WAF, key management, threat detection
}

export interface WorkloadComponent {
  id: string;
  name: string;
  description: string;
  icon: string;
  // Returns null when the component is NOT part of the architecture at the
  // current priority levels (e.g. security add-ons only appear once security is
  // medium+, a cache only at high performance). The engine and the
  // "what this builds" panel skip null components.
  getRequirements: (p: WorkloadPriorities) => {
    productType: ProductType;
    minVcpus?: number;
    minMemoryGb?: number;
    category?: string;
    // AI-only refinements: filter matched AI rows by capability tier
    // (Frontier/Standard/Efficient) and/or modality (Chat/Coding/Embedding/
    // Reranking/Image/Audio/Reasoning) — see attributes->>'modelTier' /
    // attributes->>'modality' in the pricing_records table.
    modelTier?: string;
    modality?: string;
    quantity: number;
  } | null;
}

// Sponsor banner slot. Image should be a 1200×200 (6:1) asset — see /docs
// "Advertising with us" for specs. Slots render as the "become a sponsor"
// pitch box when unset.
export interface SponsorSlot {
  imageUrl: string;
  companyName: string;
  linkUrl: string;
}

export interface WorkloadDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  components: WorkloadComponent[];
  // What the "Capacity" slider means in this workload's context, e.g.
  // "Concurrent Users", "Ingestion Throughput", "Document Corpus". Cosmetic —
  // shown as the Capacity slider's sublabel. Defaults to a generic term.
  capacityLabel?: string;
  sponsor?: SponsorSlot;
}
