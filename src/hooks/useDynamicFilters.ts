import { useQuery } from '@tanstack/react-query';
import * as config from '@/config';

export function useDynamicFilters() {
  const { data: dynamicData, isLoading } = useQuery({
    queryKey: ['dynamic-filters'],
    queryFn: async () => {
      const res = await fetch('/api/filters');
      if (!res.ok) throw new Error('Failed to fetch filters');
      return res.json();
    },
    staleTime: 600000, // 10 minutes
  });

  // Merge dynamic data with static config.
  //
  // Deliberately does NOT sort. Ordering is decided at render time by
  // orderOptions() in components/FilterControls.tsx, which knows whether a given
  // facet is alphabetical or an ordinal ladder. Sorting here as well silently
  // overrode that: AI_MODEL_TIERS is marked preserveOrder (Frontier > Standard >
  // Efficient) but arrives pre-alphabetized, so the render-layer flag had nothing
  // left to preserve. One place owns ordering.
  //
  // De-duplication is case-insensitive because the two sides disagree on casing
  // for the same value — the DB may hold 'yes' where config holds 'Yes'. A
  // case-sensitive Set keeps both and the filter shows one concept twice. Static
  // config wins on casing since that is the label the UI is written against.
  const merge = (staticList: string[], dynamicList?: string[]) => {
    if (!dynamicList || !Array.isArray(dynamicList)) return staticList;
    const seen = new Map<string, string>();
    for (const v of [...staticList, ...dynamicList]) {
      const key = String(v).trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, v);
    }
    return [...seen.values()];
  };

  const CPU_PROFILES = (() => {
    // Flatten every vendor already covered by a config profile (ARM covers both
    // AWS/Graviton and Ampere) so they aren't re-added as stray single profiles.
    const existingVendors = new Set(config.CPU_PROFILES.flatMap(p => p.vendors));
    const newVendors = (dynamicData?.cpu_vendors || []).filter((v: string) => !existingVendors.has(v));
    const newProfiles = newVendors.map((v: string) => ({
      id: v.toLowerCase(),
      label: v,
      vendors: [v],
      arch: dynamicData?.architectures?.[0] || 'x86 64' // Best guess fallback
    }));
    return [...config.CPU_PROFILES, ...newProfiles];
  })();

  return {
    isLoading,
    // Dynamically merged
    GEOGRAPHIES: merge(config.GEOGRAPHIES, dynamicData?.geographies),
    GEOGRAPHIES_SECURITY: merge([], dynamicData?.geographies_security),
    GEOGRAPHIES_ANALYTICS: merge([], dynamicData?.geographies_analytics),
    OS_TYPES: merge(config.OS_TYPES, dynamicData?.os_types),
    CATEGORIES: merge(config.CATEGORIES, dynamicData?.categories),
    // No static fallback — the GPU model/vendor lists are entirely
    // ingestion-derived (src/config/gpu_models.ts classifiers), so they should
    // only ever show models/vendors we actually have priced data for.
    GPU_MODELS: merge([], dynamicData?.gpu_models),
    GPU_VENDORS: merge([], dynamicData?.gpu_vendors),
    DB_ENGINES: merge(config.DB_ENGINES, dynamicData?.engines),
    DEPLOYMENT_TYPES: merge(config.DEPLOYMENT_TYPES, dynamicData?.deployment_types),
    HA_MODES: merge(config.HA_MODES, dynamicData?.ha_modes),
    SERVERLESS_LANGUAGES: merge(config.SERVERLESS_LANGUAGES, dynamicData?.serverless_languages),
    ANALYTICS_TIERS: merge(config.ANALYTICS_TIERS, dynamicData?.tiers),
    AI_MODEL_TIERS: merge(config.AI_MODEL_TIERS, dynamicData?.ai_model_tiers),
    AI_MODALITIES: merge(config.AI_MODALITIES, dynamicData?.ai_modalities),
    AI_CONTEXT_WINDOWS: config.AI_CONTEXT_WINDOWS,
    AI_MULTIMODAL_OPTIONS: merge(config.AI_MULTIMODAL_OPTIONS, dynamicData?.ai_multimodal),
    CONTAINERS_ORCHESTRATORS: merge(config.CONTAINERS_ORCHESTRATORS, dynamicData?.orchestrators),
    CONTAINERS_COMPUTE_TYPES: merge(config.CONTAINERS_COMPUTE_TYPES, dynamicData?.container_compute_types),
    CONTAINERS_ARCHITECTURES: merge(config.CONTAINERS_ARCHITECTURES, dynamicData?.container_architectures),
    CONTAINERS_BILLING_GRANULARITY: merge(config.CONTAINERS_BILLING_GRANULARITY, dynamicData?.billing_granularities),
    SERVERLESS_EXECUTION_MODEL_OPTIONS: merge(config.SERVERLESS_EXECUTION_MODEL_OPTIONS, dynamicData?.execution_models),
    SERVERLESS_PROVISIONED_CONCURRENCY_OPTIONS: merge(config.SERVERLESS_PROVISIONED_CONCURRENCY_OPTIONS, dynamicData?.provisioned_concurrency),
    NETWORKING_USAGE_TIERS: merge(config.NETWORKING_USAGE_TIERS, dynamicData?.usage_tiers),
    NETWORKING_TRANSFER_SCOPES: merge(config.NETWORKING_TRANSFER_SCOPES, dynamicData?.transfer_scopes),
    CPU_PROFILES,
    
    // Pass through unchanged constants
    SERVERLESS_COLD_START_OPTIONS: config.SERVERLESS_COLD_START_OPTIONS,
    SERVERLESS_MEMORY_CONFIG_OPTIONS: config.SERVERLESS_MEMORY_CONFIG_OPTIONS,
    SERVERLESS_FREE_TIER_OPTIONS: config.SERVERLESS_FREE_TIER_OPTIONS,
    SERVERLESS_GRANULARITY_OPTIONS: config.SERVERLESS_GRANULARITY_OPTIONS,
    SERVERLESS_EPHEMERAL_STORAGE_OPTIONS: config.SERVERLESS_EPHEMERAL_STORAGE_OPTIONS,
    SERVERLESS_ARCHITECTURES: config.SERVERLESS_ARCHITECTURES,
    NETWORKING_SERVICES: merge(config.NETWORKING_SERVICES, dynamicData?.networking_services),
    SECURITY_SERVICES: merge(config.SECURITY_SERVICES, dynamicData?.security_services),
    SECURITY_SERVICE_GROUPS: config.SECURITY_SERVICE_GROUPS,
    NETWORKING_SERVICE_GROUPS: config.NETWORKING_SERVICE_GROUPS,
    NETWORKING_CONNECTION_TYPES: config.NETWORKING_CONNECTION_TYPES,
    NETWORKING_ROUTING_TYPES: config.NETWORKING_ROUTING_TYPES,
    NETWORKING_HA_SUPPORT: config.NETWORKING_HA_SUPPORT,
    NETWORKING_VPC_SUPPORT: config.NETWORKING_VPC_SUPPORT,
    NETWORKING_DIRECTIONS: config.NETWORKING_DIRECTIONS,
    NETWORKING_BILLING_MODELS: config.NETWORKING_BILLING_MODELS,
    NETWORKING_PORT_CAPACITIES: config.NETWORKING_PORT_CAPACITIES,
    ANALYTICS_ENGINES: config.ANALYTICS_ENGINES,
    ANALYTICS_DEPLOYMENT_TYPES: config.ANALYTICS_DEPLOYMENT_TYPES,
    AI_SERVICE_TYPES: config.AI_SERVICE_TYPES,
    DEFAULT_VCPU_RANGE: config.DEFAULT_VCPU_RANGE,
    DEFAULT_MEMORY_RANGE: config.DEFAULT_MEMORY_RANGE,
    DEFAULT_SERVERLESS_VCPU_RANGE: config.DEFAULT_SERVERLESS_VCPU_RANGE,
    DEFAULT_SERVERLESS_MEMORY_RANGE: config.DEFAULT_SERVERLESS_MEMORY_RANGE,
    DEFAULT_SERVERLESS_TIMEOUT_RANGE: config.DEFAULT_SERVERLESS_TIMEOUT_RANGE,
    DEFAULT_CONTAINERS_VCPU_RANGE: config.DEFAULT_CONTAINERS_VCPU_RANGE,
    DEFAULT_CONTAINERS_MEMORY_RANGE: config.DEFAULT_CONTAINERS_MEMORY_RANGE,
    DEFAULT_PRICE_RANGE: config.DEFAULT_PRICE_RANGE,
    DEFAULT_GPU_COUNT_RANGE: config.DEFAULT_GPU_COUNT_RANGE,
    PROVIDERS: config.PROVIDERS,
    DB_FAMILIES: merge(config.DB_FAMILIES, (dynamicData?.db_families || []).filter((f: string) => !['database', 'databases'].includes(f.toLowerCase()))),
    STORAGE_CATEGORIES: merge(config.STORAGE_CATEGORIES, dynamicData?.storage_categories),
    STORAGE_REDUNDANCIES: merge(config.STORAGE_REDUNDANCIES, dynamicData?.storage_redundancies),
    STORAGE_MEDIA: merge(config.STORAGE_MEDIA, dynamicData?.storage_media),
    STORAGE_TIERS: merge(config.STORAGE_TIERS, dynamicData?.storage_tiers),
    
    // App Hosting
    APP_HOSTING_TIERS: merge(config.APP_HOSTING_TIERS, dynamicData?.app_hosting_tiers),
    APP_HOSTING_COMPUTE_TYPES: merge(config.APP_HOSTING_COMPUTE_TYPES, dynamicData?.app_hosting_compute_types),
    
    // Serverless service-type (Compute / API Gateway / Messaging / Eventing / Workflow)
    SERVERLESS_SERVICE_TYPES: merge(config.SERVERLESS_SERVICE_TYPES, dynamicData?.serverless_service_types),
    
    // Registry Pricing Component
    REGISTRY_PRICING_COMPONENTS: config.REGISTRY_PRICING_COMPONENTS,
  };
}
