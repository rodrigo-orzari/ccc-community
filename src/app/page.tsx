'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import Link from 'next/link';
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ProductType, PricingRecord } from '@/types';
import {
  Sidebar,
  ProviderCards,
  TableToolbar,
  PricingTable,
  FilterSidebar,
  Footer,
  ChartsView,
  CategorySummaryTable,
  FeedbackToast,
} from '@/components';
import { useDynamicFilters } from '@/hooks/useDynamicFilters';
import * as staticConfig from '@/config';
import { getExportDisclaimerCsvRows } from '@/lib/exportDisclaimer';

export default function Dashboard() {
  const config = useDynamicFilters();
  const [activeProductType, setActiveProductType] = useState<ProductType>('ai');

  // Initialize from URL query param if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const product = params.get('product');
      if (product) {
        // Handle the mapping from 'compute' back to 'vm'
        setActiveProductType(product === 'compute' ? 'vm' : product as ProductType);
      }
    }
  }, []);

  const [filtersSynced, setFiltersSynced] = useState(false);
  useEffect(() => {
    if (config.isLoading || filtersSynced) return;

    // When the dynamic (DB-derived) filter config finishes loading, replace any
    // filter group that is STILL at its full static default with the dynamic list.
    // A group counts as "untouched by the user" when its length equals the static
    // default's length. Each entry is [ currentSelection, setter, staticDefaultLen,
    // () => dynamicValue ]; the value is a thunk so it's only built when applied
    // (identical lazy behavior to the old per-line `if`s).
    const syncGroups: Array<[string[], (v: string[]) => void, number, () => string[]]> = [
      [selectedGeographies, setSelectedGeographies, staticConfig.GEOGRAPHIES.length, () => [...config.GEOGRAPHIES]],
      [selectedOS, setSelectedOS, staticConfig.OS_TYPES.length, () => [...config.OS_TYPES]],
      [selectedCpu, setSelectedCpu, staticConfig.CPU_PROFILES.length, () => [...config.CPU_PROFILES.map(p => p.id)]],
      [selectedCategory, setSelectedCategory, staticConfig.CATEGORIES.length, () => [...config.CATEGORIES]],
      [selectedDbFamilies, setSelectedDbFamilies, staticConfig.DB_FAMILIES.length, () => [...config.DB_FAMILIES]],
      [selectedEngines, setSelectedEngines, staticConfig.DB_ENGINES.length, () => [...config.DB_ENGINES]],
      [selectedDeploymentTypes, setSelectedDeploymentTypes, staticConfig.DEPLOYMENT_TYPES.length, () => [...config.DEPLOYMENT_TYPES]],
      [selectedHaModes, setSelectedHaModes, staticConfig.HA_MODES.length, () => [...config.HA_MODES]],
      [selectedServerlessLanguages, setSelectedServerlessLanguages, staticConfig.SERVERLESS_LANGUAGES.length, () => [...config.SERVERLESS_LANGUAGES]],
      [selectedServerlessColdStart, setSelectedServerlessColdStart, staticConfig.SERVERLESS_COLD_START_OPTIONS.length, () => [...config.SERVERLESS_COLD_START_OPTIONS]],
      [selectedServerlessMemoryConfig, setSelectedServerlessMemoryConfig, staticConfig.SERVERLESS_MEMORY_CONFIG_OPTIONS.length, () => [...config.SERVERLESS_MEMORY_CONFIG_OPTIONS]],
      [selectedServerlessFreeTier, setSelectedServerlessFreeTier, staticConfig.SERVERLESS_FREE_TIER_OPTIONS.length, () => [...config.SERVERLESS_FREE_TIER_OPTIONS]],
      [selectedServerlessGranularity, setSelectedServerlessGranularity, staticConfig.SERVERLESS_GRANULARITY_OPTIONS.length, () => [...config.SERVERLESS_GRANULARITY_OPTIONS]],
      [selectedServerlessExecutionModel, setSelectedServerlessExecutionModel, staticConfig.SERVERLESS_EXECUTION_MODEL_OPTIONS.length, () => [...config.SERVERLESS_EXECUTION_MODEL_OPTIONS]],
      [selectedServerlessProvisionedConcurrency, setSelectedServerlessProvisionedConcurrency, staticConfig.SERVERLESS_PROVISIONED_CONCURRENCY_OPTIONS.length, () => [...config.SERVERLESS_PROVISIONED_CONCURRENCY_OPTIONS]],
      [selectedServerlessEphemeralStorage, setSelectedServerlessEphemeralStorage, staticConfig.SERVERLESS_EPHEMERAL_STORAGE_OPTIONS.length, () => [...config.SERVERLESS_EPHEMERAL_STORAGE_OPTIONS]],
      [selectedServerlessArchitectures, setSelectedServerlessArchitectures, staticConfig.SERVERLESS_ARCHITECTURES.length, () => [...config.SERVERLESS_ARCHITECTURES]],
      [selectedContainersOrchestrators, setSelectedContainersOrchestrators, staticConfig.CONTAINERS_ORCHESTRATORS.length, () => [...config.CONTAINERS_ORCHESTRATORS]],
      [selectedContainersComputeTypes, setSelectedContainersComputeTypes, staticConfig.CONTAINERS_COMPUTE_TYPES.length, () => [...config.CONTAINERS_COMPUTE_TYPES]],
      [selectedContainersArchitectures, setSelectedContainersArchitectures, staticConfig.CONTAINERS_ARCHITECTURES.length, () => [...config.CONTAINERS_ARCHITECTURES]],
      [selectedContainersBillingGranularity, setSelectedContainersBillingGranularity, staticConfig.CONTAINERS_BILLING_GRANULARITY.length, () => [...config.CONTAINERS_BILLING_GRANULARITY]],
      [selectedAnalyticsEngines, setSelectedAnalyticsEngines, staticConfig.ANALYTICS_ENGINES.length, () => [...config.ANALYTICS_ENGINES]],
      [selectedAnalyticsDeploymentTypes, setSelectedAnalyticsDeploymentTypes, staticConfig.ANALYTICS_DEPLOYMENT_TYPES.length, () => [...config.ANALYTICS_DEPLOYMENT_TYPES]],
      [selectedAnalyticsTiers, setSelectedAnalyticsTiers, staticConfig.ANALYTICS_TIERS.length, () => [...config.ANALYTICS_TIERS]],
      [selectedAiServiceTypes, setSelectedAiServiceTypes, staticConfig.AI_SERVICE_TYPES.length, () => [...config.AI_SERVICE_TYPES]],
      [selectedAiModelTiers, setSelectedAiModelTiers, staticConfig.AI_MODEL_TIERS.length, () => [...config.AI_MODEL_TIERS]],
      [selectedAiModalities, setSelectedAiModalities, staticConfig.AI_MODALITIES.length, () => [...config.AI_MODALITIES]],
      [selectedAiContextWindows, setSelectedAiContextWindows, staticConfig.AI_CONTEXT_WINDOWS.length, () => [...config.AI_CONTEXT_WINDOWS]],
      [selectedAiMultimodalOptions, setSelectedAiMultimodalOptions, staticConfig.AI_MULTIMODAL_OPTIONS.length, () => [...config.AI_MULTIMODAL_OPTIONS]],
      [selectedNetworkingServices, setSelectedNetworkingServices, staticConfig.NETWORKING_SERVICES.length, () => [...config.NETWORKING_SERVICES]],
      [selectedSecurityServices, setSelectedSecurityServices, staticConfig.SECURITY_SERVICES.length, () => [...config.SECURITY_SERVICES]],
      [selectedNetworkingConnectionTypes, setSelectedNetworkingConnectionTypes, staticConfig.NETWORKING_CONNECTION_TYPES.length, () => [...config.NETWORKING_CONNECTION_TYPES]],
      [selectedNetworkingRoutingTypes, setSelectedNetworkingRoutingTypes, staticConfig.NETWORKING_ROUTING_TYPES.length, () => [...config.NETWORKING_ROUTING_TYPES]],
      [selectedNetworkingHaSupport, setSelectedNetworkingHaSupport, staticConfig.NETWORKING_HA_SUPPORT.length, () => [...config.NETWORKING_HA_SUPPORT]],
      [selectedNetworkingVpcSupport, setSelectedNetworkingVpcSupport, staticConfig.NETWORKING_VPC_SUPPORT.length, () => [...config.NETWORKING_VPC_SUPPORT]],
      [selectedNetworkingDirections, setSelectedNetworkingDirections, staticConfig.NETWORKING_DIRECTIONS.length, () => [...config.NETWORKING_DIRECTIONS]],
      [selectedNetworkingBillingModels, setSelectedNetworkingBillingModels, staticConfig.NETWORKING_BILLING_MODELS.length, () => [...config.NETWORKING_BILLING_MODELS]],
      [selectedNetworkingUsageTiers, setSelectedNetworkingUsageTiers, staticConfig.NETWORKING_USAGE_TIERS.length, () => [...config.NETWORKING_USAGE_TIERS]],
      [selectedNetworkingPortCapacities, setSelectedNetworkingPortCapacities, staticConfig.NETWORKING_PORT_CAPACITIES.length, () => [...config.NETWORKING_PORT_CAPACITIES]],
      [selectedNetworkingTransferScopes, setSelectedNetworkingTransferScopes, staticConfig.NETWORKING_TRANSFER_SCOPES.length, () => [...config.NETWORKING_TRANSFER_SCOPES]],
      [selectedStorageCategories, setSelectedStorageCategories, staticConfig.STORAGE_CATEGORIES.length, () => [...config.STORAGE_CATEGORIES]],
      [selectedStorageRedundancies, setSelectedStorageRedundancies, staticConfig.STORAGE_REDUNDANCIES.length, () => [...config.STORAGE_REDUNDANCIES]],
      [selectedStorageMedia, setSelectedStorageMedia, staticConfig.STORAGE_MEDIA.length, () => [...config.STORAGE_MEDIA]],
      [selectedStorageTiers, setSelectedStorageTiers, staticConfig.STORAGE_TIERS.length, () => [...config.STORAGE_TIERS]],
      [selectedAppHostingTiers, setSelectedAppHostingTiers, staticConfig.APP_HOSTING_TIERS.length, () => [...config.APP_HOSTING_TIERS]],
      [selectedAppHostingComputeTypes, setSelectedAppHostingComputeTypes, staticConfig.APP_HOSTING_COMPUTE_TYPES.length, () => [...config.APP_HOSTING_COMPUTE_TYPES]],
      [selectedServerlessServiceTypes, setSelectedServerlessServiceTypes, staticConfig.SERVERLESS_SERVICE_TYPES.length, () => [...config.SERVERLESS_SERVICE_TYPES]],
      [selectedIntegrationServices, setSelectedIntegrationServices, staticConfig.INTEGRATION_SERVICES.length, () => [...staticConfig.INTEGRATION_SERVICES]],
      [selectedIntegrationTiers, setSelectedIntegrationTiers, staticConfig.INTEGRATION_TIERS.length, () => [...staticConfig.INTEGRATION_TIERS]],
      [selectedIntegrationSizes, setSelectedIntegrationSizes, staticConfig.INTEGRATION_SIZES.length, () => [...staticConfig.INTEGRATION_SIZES]],
      [selectedIntegrationProtocols, setSelectedIntegrationProtocols, staticConfig.INTEGRATION_PROTOCOLS.length, () => [...staticConfig.INTEGRATION_PROTOCOLS]],
      [selectedIntegrationPricingModels, setSelectedIntegrationPricingModels, staticConfig.INTEGRATION_PRICING_MODELS.length, () => [...staticConfig.INTEGRATION_PRICING_MODELS]],
    ];

    for (const [current, setter, staticLen, next] of syncGroups) {
      if (current.length === staticLen) setter(next());
    }

    setFiltersSynced(true);
  }, [config.isLoading, filtersSynced, config]);

  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedGeographies, setSelectedGeographies] = useState<string[]>([]);
  const [selectedOS, setSelectedOS] = useState<string[]>([]);
  const [selectedCpu, setSelectedCpu] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedGpuModels, setSelectedGpuModels] = useState<string[]>([]);
  const [selectedGpuVendors, setSelectedGpuVendors] = useState<string[]>([]);

  const [selectedDbFamilies, setSelectedDbFamilies] = useState<string[]>([]);
  const [selectedEngines, setSelectedEngines] = useState<string[]>([]);
  const [selectedDeploymentTypes, setSelectedDeploymentTypes] = useState<string[]>([]);
  const [selectedHaModes, setSelectedHaModes] = useState<string[]>([]);

  // When the category changes, drop any explicitly-selected provider that doesn't
  // exist in the new category (e.g. OpenAI when leaving AI) so the sidebar never
  // shows a checked box for a provider this category can't return.
  //
  // Filtering is additive: an empty selection means "no provider constraint", which
  // already yields every applicable provider. So there's nothing to auto-select here —
  // if the user narrowed to a provider that survives the category change we keep it,
  // otherwise we fall back to unconstrained rather than silently re-checking boxes.
  useEffect(() => {
    const applicableIds = staticConfig.providersForType(activeProductType).map(p => p.id);
    setSelectedProviders(prev => prev.filter(p => applicableIds.includes(p)));
  }, [activeProductType]);

  const [selectedServerlessLanguages, setSelectedServerlessLanguages] = useState<string[]>([]);
  const [selectedServerlessColdStart, setSelectedServerlessColdStart] = useState<string[]>([]);
  const [selectedServerlessMemoryConfig, setSelectedServerlessMemoryConfig] = useState<string[]>([]);
  const [selectedServerlessFreeTier, setSelectedServerlessFreeTier] = useState<string[]>([]);
  const [selectedServerlessGranularity, setSelectedServerlessGranularity] = useState<string[]>([]);
  const [selectedServerlessExecutionModel, setSelectedServerlessExecutionModel] = useState<string[]>([]);
  const [selectedServerlessProvisionedConcurrency, setSelectedServerlessProvisionedConcurrency] = useState<string[]>([]);
  const [selectedServerlessEphemeralStorage, setSelectedServerlessEphemeralStorage] = useState<string[]>([]);
  const [selectedServerlessArchitectures, setSelectedServerlessArchitectures] = useState<string[]>([]);

  const [selectedContainersOrchestrators, setSelectedContainersOrchestrators] = useState<string[]>([]);
  const [selectedContainersComputeTypes, setSelectedContainersComputeTypes] = useState<string[]>([]);
  const [selectedContainersArchitectures, setSelectedContainersArchitectures] = useState<string[]>([]);
  const [selectedContainersBillingGranularity, setSelectedContainersBillingGranularity] = useState<string[]>([]);
  const [selectedContainersServiceTypes, setSelectedContainersServiceTypes] = useState<string[]>([]);
  const [selectedRegistryPricingComponent, setSelectedRegistryPricingComponent] = useState<string[]>([]);

  const [selectedAnalyticsEngines, setSelectedAnalyticsEngines] = useState<string[]>([]);
  const [selectedAnalyticsDeploymentTypes, setSelectedAnalyticsDeploymentTypes] = useState<string[]>([]);
  const [selectedAnalyticsTiers, setSelectedAnalyticsTiers] = useState<string[]>([]);

  // AI
  const [selectedAiServiceTypes, setSelectedAiServiceTypes] = useState<string[]>([]);
  const [selectedAiModelTiers, setSelectedAiModelTiers] = useState<string[]>([]);
  const [selectedAiModalities, setSelectedAiModalities] = useState<string[]>([]);
  const [selectedAiContextWindows, setSelectedAiContextWindows] = useState<string[]>([]);
  const [selectedAiMultimodalOptions, setSelectedAiMultimodalOptions] = useState<string[]>([]);

  const [selectedNetworkingServices, setSelectedNetworkingServices] = useState<string[]>([]);
  const [selectedSecurityServices, setSelectedSecurityServices] = useState<string[]>([]);
  const [selectedNetworkingConnectionTypes, setSelectedNetworkingConnectionTypes] = useState<string[]>([]);
  const [selectedNetworkingRoutingTypes, setSelectedNetworkingRoutingTypes] = useState<string[]>([]);
  const [selectedNetworkingHaSupport, setSelectedNetworkingHaSupport] = useState<string[]>([]);
  const [selectedNetworkingVpcSupport, setSelectedNetworkingVpcSupport] = useState<string[]>([]);
  const [selectedNetworkingDirections, setSelectedNetworkingDirections] = useState<string[]>([]);
  const [selectedNetworkingBillingModels, setSelectedNetworkingBillingModels] = useState<string[]>([]);
  const [selectedNetworkingUsageTiers, setSelectedNetworkingUsageTiers] = useState<string[]>([]);
  const [selectedNetworkingPortCapacities, setSelectedNetworkingPortCapacities] = useState<string[]>([]);
  const [selectedNetworkingTransferScopes, setSelectedNetworkingTransferScopes] = useState<string[]>([]);

  const [selectedStorageCategories, setSelectedStorageCategories] = useState<string[]>([]);
  const [selectedStorageRedundancies, setSelectedStorageRedundancies] = useState<string[]>([]);
  const [selectedStorageMedia, setSelectedStorageMedia] = useState<string[]>([]);
  const [selectedStorageTiers, setSelectedStorageTiers] = useState<string[]>([]);

  const [selectedAppHostingTiers, setSelectedAppHostingTiers] = useState<string[]>([]);
  const [selectedAppHostingComputeTypes, setSelectedAppHostingComputeTypes] = useState<string[]>([]);


  const [selectedServerlessServiceTypes, setSelectedServerlessServiceTypes] = useState<string[]>([]);
  const [selectedIntegrationServices, setSelectedIntegrationServices] = useState<string[]>([]);
  const [selectedIntegrationTiers, setSelectedIntegrationTiers] = useState<string[]>([]);
  const [selectedIntegrationSizes, setSelectedIntegrationSizes] = useState<string[]>([]);
  const [selectedIntegrationProtocols, setSelectedIntegrationProtocols] = useState<string[]>([]);
  const [selectedIntegrationPricingModels, setSelectedIntegrationPricingModels] = useState<string[]>([]);



  // Range filters
      
  const [vCpuRange, setVCpuRange] = useState({ ...config.DEFAULT_VCPU_RANGE });
  const [memoryRange, setMemoryRange] = useState({ ...config.DEFAULT_MEMORY_RANGE });
  const [serverlessVCpuRange, setServerlessVCpuRange] = useState({ ...config.DEFAULT_SERVERLESS_VCPU_RANGE });
  const [serverlessMemoryRange, setServerlessMemoryRange] = useState({ ...config.DEFAULT_SERVERLESS_MEMORY_RANGE });
  const [serverlessTimeoutRange, setServerlessTimeoutRange] = useState({ ...config.DEFAULT_SERVERLESS_TIMEOUT_RANGE });
  const [containersVCpuRange, setContainersVCpuRange] = useState({ ...config.DEFAULT_CONTAINERS_VCPU_RANGE });
  const [containersMemoryRange, setContainersMemoryRange] = useState({ ...config.DEFAULT_CONTAINERS_MEMORY_RANGE });
  const [priceRange, setPriceRange] = useState({ ...config.DEFAULT_PRICE_RANGE });
  const [outputPriceRange, setOutputPriceRange] = useState({ ...config.DEFAULT_PRICE_RANGE });
  const [gpuCountRange, setGpuCountRange] = useState({ ...config.DEFAULT_GPU_COUNT_RANGE });
  const [search, setSearch] = useState('');

  // "Did the user actually apply a filter" — checked against the filter
  // groups common across every product category (provider/geography/OS/CPU/
  // category) plus the DB-specific ones and free-text search. Not exhaustive
  // across every category-specific checkbox (~30 exist across serverless/
  // containers/networking/etc.), but catches the large majority of real
  // filtering activity without threading every one of them through. Feeds
  // the post-filter feedback toast below.
  const hasActiveFilters = useMemo(() => (
    selectedProviders.length > 0 ||
    selectedGeographies.length > 0 ||
    selectedOS.length > 0 ||
    selectedCpu.length > 0 ||
    selectedCategory.length > 0 ||
    selectedGpuModels.length > 0 ||
    selectedGpuVendors.length > 0 ||
    selectedDbFamilies.length > 0 ||
    selectedEngines.length > 0 ||
    selectedDeploymentTypes.length > 0 ||
    selectedHaModes.length > 0 ||
    search.trim().length > 0
  ), [selectedProviders, selectedGeographies, selectedOS, selectedCpu, selectedCategory, selectedGpuModels, selectedGpuVendors, selectedDbFamilies, selectedEngines, selectedDeploymentTypes, selectedHaModes, search]);

  // Seed product type / provider / search from URL params so deep links from the
  // workloads pages (and shared URLs) land on a pre-filtered view.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    // The URL uses 'compute' but the internal ProductType is 'vm'. Seeding the raw
    // value here left activeProductType as 'compute', which matches no `=== 'vm'`
    // branch — so landing directly on /?product=compute silently dropped the
    // Geography / Category / OS / CPU filter sections from the sidebar.
    const rawProduct = sp.get('product');
    const product = (rawProduct === 'compute' ? 'vm' : rawProduct) as ProductType | null;
    if (product && product !== activeProductType) setActiveProductType(product);
    const provider = sp.get('provider');
    if (provider) setSelectedProviders(provider.split(',').filter(Boolean));
    const q = sp.get('search');
    if (q) setSearch(q);
    // Run only on initial mount; subsequent navigations are driven by user state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync core filters to Microsoft Clarity Custom Tags
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof (window as any).clarity === 'function') {
      try {
        (window as any).clarity("set", "product_category", activeProductType);
        (window as any).clarity("set", "providers_compared", selectedProviders.join(','));
        if (search) {
          (window as any).clarity("set", "search_term", search);
        }
      } catch (err) {
        console.warn("Clarity set failed", err);
      }
    }
  }, [activeProductType, selectedProviders, search]);

  const [showAggregation, setShowAggregation] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof PricingRecord | string; direction: 'asc' | 'desc' }>({
    key: 'price_per_unit',
    direction: 'asc',
  });

  // UI state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    provider: true,
    category: true,
    geography: true,
    os: true,
    cpu: true,
    gpuModel: true,
    gpuVendor: true,
    specs: true,
    dbFamily: true,
    engine: true,
    deploymentType: true,
    haMode: true,
    languages: true,
    coldStart: true,
    timeout: true,
    memoryConfig: true,
    freeTier: true,
    granularity: true,
    executionModel: true,
    provisionedConcurrency: true,
    ephemeralStorage: true,
    containersOrchestrator: true,
    containersComputeType: true,
    containersArchitecture: true,
    containersBillingGranularity: true,
    networkingService: true,
    networkingConnectionType: true,
    networkingRoutingType: true,
    networkingHaSupport: true,
    networkingVpcSupport: true,
    networkingTransferDirection: true,
    networkingBillingModel: true,
    networkingUsageTier: true,
    networkingPortCapacity: true,
    networkingTransferScope: true,
  });

  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [isInitialFetch, setIsInitialFetch] = useState(true);

  const toggleSection = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleFilter = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Build search params
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    // API uses 'compute' for VMs; React state uses 'vm'
    params.append('product', activeProductType === 'vm' ? 'compute' : activeProductType);
    // Only send a filter when the user has narrowed it to a STRICT SUBSET of
    // the available options. When every option is selected we OMIT the param
    // entirely so the API applies no filter and returns all matching DB rows —
    // including values the UI doesn't enumerate (e.g. Outpost DB engines,
    // containers with NULL attributes). Sending the full list as an allow-list
    // was silently hiding any DB value not present in the hardcoded UI lists.
    const subset = (name: string, selected: string[], full: readonly string[]) => {
      if (selected.length > 0 && selected.length < full.length) {
        params.append(name, selected.join(','));
      }
    };

    subset('geography', selectedGeographies, config.GEOGRAPHIES);
    subset('os', selectedOS, config.OS_TYPES);
    // Translate CPU profile IDs → vendor names the API understands
    const allVendors = Array.from(new Set(config.CPU_PROFILES.flatMap(p => p.vendors)));
    const selectedVendors = Array.from(new Set(
      selectedCpu.flatMap(id => config.CPU_PROFILES.find(p => p.id === id)?.vendors ?? [])
    ));
    subset('cpuVendor', selectedVendors, allVendors);
    subset('category', selectedCategory, config.CATEGORIES);
    subset('gpuModel', selectedGpuModels, config.GPU_MODELS);
    subset('gpuVendor', selectedGpuVendors, config.GPU_VENDORS);
    subset('dbFamilies', selectedDbFamilies, config.DB_FAMILIES);
    subset('engines', selectedEngines, config.DB_ENGINES);
    subset('deploymentTypes', selectedDeploymentTypes, config.DEPLOYMENT_TYPES);
    subset('haModes', selectedHaModes, config.HA_MODES);
    subset('serverlessLanguages', selectedServerlessLanguages, config.SERVERLESS_LANGUAGES);
    subset('serverlessColdStart', selectedServerlessColdStart, config.SERVERLESS_COLD_START_OPTIONS);
    subset('serverlessMemoryConfig', selectedServerlessMemoryConfig, config.SERVERLESS_MEMORY_CONFIG_OPTIONS);
    subset('serverlessFreeTier', selectedServerlessFreeTier, config.SERVERLESS_FREE_TIER_OPTIONS);
    subset('serverlessGranularity', selectedServerlessGranularity, config.SERVERLESS_GRANULARITY_OPTIONS);
    subset('serverlessExecutionModel', selectedServerlessExecutionModel, config.SERVERLESS_EXECUTION_MODEL_OPTIONS);
    subset('serverlessProvisionedConcurrency', selectedServerlessProvisionedConcurrency, config.SERVERLESS_PROVISIONED_CONCURRENCY_OPTIONS);
    subset('serverlessEphemeralStorage', selectedServerlessEphemeralStorage, config.SERVERLESS_EPHEMERAL_STORAGE_OPTIONS);
    subset('serverlessArchitecture', selectedServerlessArchitectures, config.SERVERLESS_ARCHITECTURES);
    subset('containersOrchestrators', selectedContainersOrchestrators, config.CONTAINERS_ORCHESTRATORS);
    subset('containersComputeTypes', selectedContainersComputeTypes, config.CONTAINERS_COMPUTE_TYPES);
    subset('containersArchitectures', selectedContainersArchitectures, config.CONTAINERS_ARCHITECTURES);
    subset('containersBillingGranularity', selectedContainersBillingGranularity, config.CONTAINERS_BILLING_GRANULARITY);
    subset('containersServiceTypes', selectedContainersServiceTypes, ['Orchestration', 'Container Registry']);
    subset('registryPricingComponent', selectedRegistryPricingComponent, config.REGISTRY_PRICING_COMPONENTS);
    subset('analyticsEngines', selectedAnalyticsEngines, config.ANALYTICS_ENGINES);
    subset('analyticsDeploymentTypes', selectedAnalyticsDeploymentTypes, config.ANALYTICS_DEPLOYMENT_TYPES);
    subset('analyticsTiers', selectedAnalyticsTiers, config.ANALYTICS_TIERS);
    subset('aiServiceTypes', selectedAiServiceTypes, config.AI_SERVICE_TYPES);
    subset('aiModelTiers', selectedAiModelTiers, config.AI_MODEL_TIERS);
    subset('aiModalities', selectedAiModalities, config.AI_MODALITIES);
    subset('aiContextWindows', selectedAiContextWindows, config.AI_CONTEXT_WINDOWS);
    subset('aiMultimodalOptions', selectedAiMultimodalOptions, config.AI_MULTIMODAL_OPTIONS);
    subset('networkingService', selectedNetworkingServices, config.NETWORKING_SERVICES);
    subset('securityService', selectedSecurityServices, config.SECURITY_SERVICES);
    subset('networkingConnectionTypes', selectedNetworkingConnectionTypes, config.NETWORKING_CONNECTION_TYPES);
    subset('networkingRoutingTypes', selectedNetworkingRoutingTypes, config.NETWORKING_ROUTING_TYPES);
    subset('networkingHaSupport', selectedNetworkingHaSupport, config.NETWORKING_HA_SUPPORT);
    subset('networkingVpcSupport', selectedNetworkingVpcSupport, config.NETWORKING_VPC_SUPPORT);
    subset('networkingTransferDirections', selectedNetworkingDirections, config.NETWORKING_DIRECTIONS);
    subset('networkingBillingModels', selectedNetworkingBillingModels, config.NETWORKING_BILLING_MODELS);
    subset('networkingUsageTiers', selectedNetworkingUsageTiers, config.NETWORKING_USAGE_TIERS);
    subset('networkingPortCapacities', selectedNetworkingPortCapacities, config.NETWORKING_PORT_CAPACITIES);
    subset('networkingTransferScopes', selectedNetworkingTransferScopes, config.NETWORKING_TRANSFER_SCOPES);

    subset('storageTypes', selectedStorageCategories, config.STORAGE_CATEGORIES);
    subset('storageRedundancy', selectedStorageRedundancies, config.STORAGE_REDUNDANCIES);
    subset('storageMedia', selectedStorageMedia, config.STORAGE_MEDIA);
    subset('storageTiers', selectedStorageTiers, config.STORAGE_TIERS);

    subset('appHostingTiers', selectedAppHostingTiers, config.APP_HOSTING_TIERS);
    subset('appHostingComputeTypes', selectedAppHostingComputeTypes, config.APP_HOSTING_COMPUTE_TYPES);
    subset('serverlessServiceTypes', selectedServerlessServiceTypes, config.SERVERLESS_SERVICE_TYPES);
    subset('integrationServices', selectedIntegrationServices, staticConfig.INTEGRATION_SERVICES);
    subset('integrationPricingModels', selectedIntegrationPricingModels, staticConfig.INTEGRATION_PRICING_MODELS);
    subset('integrationTiers', selectedIntegrationTiers, staticConfig.INTEGRATION_TIERS);
    subset('integrationSizes', selectedIntegrationSizes, staticConfig.INTEGRATION_SIZES);
    subset('integrationProtocols', selectedIntegrationProtocols, staticConfig.INTEGRATION_PROTOCOLS);


    // Only send range params when the user has actively constrained them.
    // At the slider floor/ceiling → no filter applied (show all).
    const currentVCpuDefault = 
      activeProductType === 'serverless' ? config.DEFAULT_SERVERLESS_VCPU_RANGE : 
      activeProductType === 'containers' ? config.DEFAULT_CONTAINERS_VCPU_RANGE : 
      config.DEFAULT_VCPU_RANGE;
    const currentMemoryDefault = 
      activeProductType === 'serverless' ? config.DEFAULT_SERVERLESS_MEMORY_RANGE : 
      activeProductType === 'containers' ? config.DEFAULT_CONTAINERS_MEMORY_RANGE : 
      config.DEFAULT_MEMORY_RANGE;
    const currentVCpuRange = 
      activeProductType === 'serverless' ? serverlessVCpuRange : 
      activeProductType === 'containers' ? containersVCpuRange : 
      vCpuRange;
    const currentMemoryRange = 
      activeProductType === 'serverless' ? serverlessMemoryRange : 
      activeProductType === 'containers' ? containersMemoryRange : 
      memoryRange;

    if (currentVCpuRange.min > currentVCpuDefault.min) params.append('minVcpu', currentVCpuRange.min.toString());
    if (currentVCpuRange.max < currentVCpuDefault.max) params.append('maxVcpu', currentVCpuRange.max.toString());
    if (currentMemoryRange.min > currentMemoryDefault.min) params.append('minMemory', currentMemoryRange.min.toString());
    if (currentMemoryRange.max < currentMemoryDefault.max) params.append('maxMemory', currentMemoryRange.max.toString());
    if (priceRange.min > config.DEFAULT_PRICE_RANGE.min) params.append('minPrice', priceRange.min.toString());
    if (priceRange.max < config.DEFAULT_PRICE_RANGE.max) params.append('maxPrice', priceRange.max.toString());
    if (activeProductType === 'serverless' && serverlessTimeoutRange.min > config.DEFAULT_SERVERLESS_TIMEOUT_RANGE.min) params.append('minTimeout', serverlessTimeoutRange.min.toString());
    if (activeProductType === 'serverless' && serverlessTimeoutRange.max < config.DEFAULT_SERVERLESS_TIMEOUT_RANGE.max) params.append('maxTimeout', serverlessTimeoutRange.max.toString());
    if (activeProductType === 'ai' && outputPriceRange.min > config.DEFAULT_PRICE_RANGE.min) params.append('minOutputPrice', outputPriceRange.min.toString());
    if (activeProductType === 'ai' && outputPriceRange.max < config.DEFAULT_PRICE_RANGE.max) params.append('maxOutputPrice', outputPriceRange.max.toString());
    if (activeProductType === 'gpu' && gpuCountRange.min > config.DEFAULT_GPU_COUNT_RANGE.min) params.append('minGpuCount', gpuCountRange.min.toString());
    if (activeProductType === 'gpu' && gpuCountRange.max < config.DEFAULT_GPU_COUNT_RANGE.max) params.append('maxGpuCount', gpuCountRange.max.toString());
    params.append('search', search);
    return params;
  }, [
    activeProductType, selectedGeographies, selectedOS, selectedCpu, selectedGpuModels, selectedGpuVendors, selectedCategory,
    selectedDbFamilies, selectedEngines, selectedDeploymentTypes, selectedHaModes,
    selectedServerlessLanguages, selectedServerlessColdStart, selectedServerlessMemoryConfig, selectedServerlessFreeTier,
    selectedServerlessGranularity, selectedServerlessExecutionModel, selectedServerlessProvisionedConcurrency, selectedServerlessEphemeralStorage,
    selectedServerlessArchitectures, selectedServerlessServiceTypes,
    selectedContainersOrchestrators, selectedContainersComputeTypes, selectedContainersArchitectures, selectedContainersBillingGranularity,
    selectedContainersServiceTypes, selectedRegistryPricingComponent,
    selectedAnalyticsEngines, selectedAnalyticsDeploymentTypes, selectedAnalyticsTiers,
    selectedAiServiceTypes, selectedAiModelTiers, selectedAiModalities, selectedAiContextWindows, selectedAiMultimodalOptions,
    selectedNetworkingServices, selectedNetworkingConnectionTypes, selectedNetworkingRoutingTypes, selectedNetworkingHaSupport, selectedNetworkingVpcSupport, selectedNetworkingDirections,
    selectedNetworkingBillingModels, selectedNetworkingUsageTiers, selectedNetworkingPortCapacities, selectedNetworkingTransferScopes,
    selectedSecurityServices,
    selectedStorageCategories, selectedStorageTiers, selectedStorageRedundancies, selectedStorageMedia,
    selectedAppHostingTiers, selectedAppHostingComputeTypes,
    selectedIntegrationServices, selectedIntegrationTiers, selectedIntegrationPricingModels,
    selectedIntegrationSizes, selectedIntegrationProtocols,
    vCpuRange, memoryRange, serverlessVCpuRange, serverlessMemoryRange, serverlessTimeoutRange, containersVCpuRange, containersMemoryRange, priceRange, outputPriceRange, gpuCountRange, search
  ]);

  const debouncedParamsString = useDeferredValue(searchParams.toString());

  // Filtering is additive: an empty selection in any facet means "no constraint",
  // not "no results" — buildPricingFilters() simply omits that WHERE clause. The
  // previous ~118-line guard here existed only to block the fetch when the user had
  // deselected every option in an all-selected-by-default facet, a state that can no
  // longer occur. Kept as a named constant so the query `enabled:` flags stay readable.
  const canFetch = true;

  // Queries
  const { data: dbStatus } = useQuery({
    queryKey: ['health', debouncedParamsString],
    queryFn: async () => {
      const res = await fetch(`/api/health?${debouncedParamsString}`);
      const status = await res.json();
      return { total: status.total_records || 0, providers: status.by_provider || [], lastUpdated: status.last_updated || null };
    },
    enabled: canFetch,
    placeholderData: keepPreviousData,
  });

  const { data: rawProviderCounts } = useQuery({
    queryKey: ['counts', debouncedParamsString],
    queryFn: async () => {
      const res = await fetch(`/api/pricing/counts?${debouncedParamsString}`);
      return res.json();
    },
    enabled: canFetch,
    placeholderData: keepPreviousData,
  });

  const providerCounts = useMemo(() => {
    if (!canFetch || !rawProviderCounts || !Array.isArray(rawProviderCounts)) return {};
    const map: Record<string, number> = {};
    rawProviderCounts.forEach(r => { map[r.slug] = parseInt(r.count) || 0; });
    return map;
  }, [canFetch, rawProviderCounts]);

  // Per-option counts shown beside each filter row. Each facet is counted with every
  // other active filter applied but not its own, so the numbers answer "what would I
  // get if I ALSO checked this?" rather than collapsing to zero once you narrow.
  const { data: rawFacetCounts } = useQuery({
    queryKey: ['facets', debouncedParamsString],
    queryFn: async () => {
      const res = await fetch(`/api/facets?${debouncedParamsString}`);
      return res.json();
    },
    enabled: canFetch,
    placeholderData: keepPreviousData,
  });

  const facetCounts = useMemo<Record<string, Record<string, number>>>(() => {
    if (!rawFacetCounts || typeof rawFacetCounts !== 'object' || rawFacetCounts.error) return {};
    return rawFacetCounts as Record<string, Record<string, number>>;
  }, [rawFacetCounts]);

  // Flip isInitialFetch off once filter-aware counts first arrive
  useEffect(() => {
    if (rawProviderCounts && Array.isArray(rawProviderCounts) && rawProviderCounts.length > 0) {
      setIsInitialFetch(false);
    }
  }, [rawProviderCounts]);

  const pricingParamsString = useMemo(() => {
    const p = new URLSearchParams(debouncedParamsString);
    p.append('provider', selectedProviders.join(','));
    if (showAggregation) p.append('aggregate', 'true');
    return p.toString();
  }, [debouncedParamsString, selectedProviders, showAggregation]);

  const { data: rawData, isFetching: loading } = useQuery({
    queryKey: ['pricing', pricingParamsString],
    queryFn: async () => {
      const res = await fetch(`/api/pricing?${pricingParamsString}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: canFetch,
    placeholderData: keepPreviousData,
  });

  const data = useMemo(() => {
    if (!canFetch || !rawData || rawData.length === 0) return [];
    return [...rawData].sort((a, b) => {
      const key = sortConfig.key as string;
      const direction = sortConfig.direction;
      let valA: any = '';
      let valB: any = '';

      if (key.includes('.')) {
        const parts = key.split('.');
        valA = a[parts[0] as keyof PricingRecord]?.[parts[1]] ?? '';
        valB = b[parts[0] as keyof PricingRecord]?.[parts[1]] ?? '';
      } else {
        valA = a[key as keyof PricingRecord] ?? '';
        valB = b[key as keyof PricingRecord] ?? '';
      }

      const numericKeys = [
        'vcpus', 'memory_gb', 'price_per_unit', 'avg_price', 'min_price', 'max_price',
        'gpu_count', 'attributes.contextWindowK', 'attributes.gpu_vram_gb',
        'attributes.timeout_seconds', 'attributes.billing_granularity_ms',
        'attributes.max_ephemeral_storage_gb', 'attributes.invocation_price_per_1m',
        'attributes.free_invocations_per_month', 'attributes.normalized_price_per_1m',
        'attributes.outputPricePer1M'
      ];
      if (numericKeys.includes(key)) {
        valA = parseFloat(valA.toString().replace(/[^0-9.-]+/g, "")) || 0;
        valB = parseFloat(valB.toString().replace(/[^0-9.-]+/g, "")) || 0;
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [canFetch, rawData, sortConfig]);

  const totalFilteredCount = useMemo(() => {
    // Additive filtering: an empty provider selection means "all providers", so sum
    // every provider that came back rather than summing an empty list (which would
    // report 0 results while the table below is full of rows).
    const ids = selectedProviders.length > 0 ? selectedProviders : Object.keys(providerCounts);
    return ids.reduce((sum, providerId) => sum + (providerCounts[providerId] || 0), 0);
  }, [selectedProviders, providerCounts]);

  // Table scroll detection
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 1;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setHasHorizontalOverflow(overflow);
      setScrolledToEnd(atEnd);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [data.length, activeProductType]);

  useEffect(() => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
      tableScrollRef.current.scrollLeft = 0;
    }
  }, [activeProductType]);

  const lastUpdated = useMemo(() => {
    if (!rawData || rawData.length === 0) return undefined;
    const maxUpdated = rawData.reduce((max, record) => {
      if (!record.updated_at) return max;
      const recordDate = new Date(record.updated_at);
      return recordDate > max ? recordDate : max;
    }, new Date(0));
    if (maxUpdated.getTime() === 0) return undefined;
    return maxUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [rawData]);

  const handleHeaderClick = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Export logic
  const handleExport = () => {
    if (data.length === 0) {
      alert('No rows match your current filters. Adjust a filter and try again.');
      return;
    }

    let headers: string[] = ['Provider', 'Product', 'Geography', 'Price (USD)', 'Source'];
    if (activeProductType === 'database') {
      headers = ['Provider', 'Product', 'Engine', 'Tier', 'Deployment', 'HA Mode', 'Geography', 'Price (USD)', 'Source'];
    } else if (activeProductType === 'serverless') {
      headers = ['Provider', 'Product', 'Service Type', 'Memory (GB)', 'Architecture', 'Languages', 'Cold Start (ms)', 'Timeout (sec)', 'Memory Config', 'Free Tier', 'Granularity', 'Execution Model', 'Provisioned Concurrency', 'Max Storage (GB)', 'Invocation Price ($/1M)', 'Geography', 'Pricing Unit', 'Price (USD)', 'Source'];
    } else if (activeProductType === 'containers') {
      headers = ['Provider', 'Product', 'Orchestrator', 'Compute Type', 'Architecture', 'Billing Granularity', 'GPU', 'Geography', 'Price (USD)', 'Source'];
    } else if (activeProductType === 'networking') {
      headers = ['Provider', 'Product', 'Service', 'Category', 'Transfer Tier', 'Destination', 'Included Transfer', 'Geography', 'Price (USD)', 'Source'];
    } else if (activeProductType === 'data-analytics') {
      headers = ['Provider', 'Product', 'Engine', 'Deployment Type', 'Tier', 'Compute Unit', 'Geography', 'Price (USD)', 'Source'];
    
    } else if (activeProductType === 'storage') {
      headers = ['Provider', 'Product', 'Category', 'Tier', 'Redundancy', 'Media', 'Geography', 'Price (USD)', 'Source'];
    } else if (activeProductType === 'app-hosting') {
      headers = ['Provider', 'Product', 'Tier', 'Compute Type', 'OS', 'Geography', 'vCPU', 'Memory (GB)', 'Price (USD)', 'Source'];
    } else if (activeProductType === 'ai') {
      headers = ['Provider', 'Product', 'Service', 'Model Tier', 'Context Window', 'Multimodal', 'Geography', 'Input Price (/1M)', 'Output Price (/1M)', 'Source'];
    } else if (activeProductType === 'gpu') {
      headers = ['Provider', 'Product', 'GPU Model', 'GPU Count', 'VRAM per GPU (GB)', 'vCPU', 'Memory (GB)', 'OS', 'Geography', 'Price (USD)', 'Source'];
    } else {
      headers = ['Provider', 'Product', 'Category', 'CPU Vendor', 'Architecture', 'OS', 'GPU', 'vCPU', 'Memory (GB)', 'Geography', 'Price (USD)', 'Source'];
    }

    const rows = data.map(record => {
      const priceDisplay = showAggregation ? (parseFloat(record.price_per_unit) * 8760).toFixed(2) : parseFloat(record.price_per_unit).toFixed(4);

      if (activeProductType === 'database') {
        return [record.provider, record.instance_type, record.attributes?.engine || '', record.category || '', record.attributes?.deployment_type || '', record.attributes?.ha_mode || '', record.geography, priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'serverless') {
        const svcType = record.attributes?.service_type || 'Compute';
        const isCompute = svcType === 'Compute';
        const rawPrice = parseFloat(record.price_per_unit).toFixed(4);
        return [record.provider, record.instance_type, svcType, isCompute ? (record.memory_gb || '') : '', isCompute ? (record.arch === 'x86 64' ? 'x86' : (record.arch || '')) : '', record.attributes?.supportedLanguages ? (Array.isArray(record.attributes.supportedLanguages) ? record.attributes.supportedLanguages.join('; ') : record.attributes.supportedLanguages) : '', record.attributes?.cold_start_overhead_ms || '', record.attributes?.timeout_seconds || '', record.attributes?.memory_configuration || '', isCompute ? (record.attributes?.free_invocations_per_month ? 'Yes' : 'No') : '', record.attributes?.billing_granularity_ms || '', record.attributes?.execution_model || '', record.attributes?.provisioned_concurrency_support || '', record.attributes?.max_ephemeral_storage_gb || '', record.attributes?.invocation_price_per_1m || '', record.geography, record.unit || '', rawPrice, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'containers') {
        return [record.provider, record.instance_type, record.attributes?.orchestrator || '', record.attributes?.compute_type || '', record.attributes?.architecture || '', record.attributes?.billing_granularity || '', record.gpu_count > 0 ? 'Yes' : 'No', record.geography, priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'networking') {
        return [record.provider, record.instance_type, record.service || '', record.category || '', record.attributes?.transfer_tier || '', record.attributes?.destination || '', record.attributes?.included_transfer || '', record.geography, priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'data-analytics') {
        return [record.provider, record.instance_type, record.attributes?.engine || '', record.attributes?.deployment_type || '', record.attributes?.tier || '', record.vcpus || '', record.geography, priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'ai') {
        return [record.provider, record.instance_type, record.service || '', record.attributes?.modelTier || '', record.attributes?.contextWindowK || '', record.attributes?.multimodal || '', record.geography, priceDisplay, record.attributes?.outputPricePer1M || '', record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'storage') {
        return [record.provider, record.instance_type, record.attributes?.storage_type || '', record.attributes?.tier || '', record.attributes?.redundancy || '', record.attributes?.media || '', record.geography, priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'app-hosting') {
        return [record.provider, record.instance_type, record.attributes?.tier || '', record.attributes?.compute_type || '', record.os || '', record.geography, record.vcpus || '', record.memory_gb || '', priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else if (activeProductType === 'gpu') {
        return [record.provider, record.instance_type, record.attributes?.gpu_model || '', record.gpu_count || '', record.attributes?.gpu_vram_gb || '', record.vcpus || '', record.memory_gb || '', record.os || '', record.geography, priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      } else {
        return [record.provider, record.instance_type, record.category || '', record.cpu_vendor || '', record.arch === 'x86 64' ? 'x86' : (record.arch || ''), record.os || '', record.gpu_count > 0 ? 'Yes' : 'No', record.vcpus || '', record.memory_gb || '', record.geography, priceDisplay, record.data_source === 'static_config' ? 'Static' : 'API'];
      }
    });

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      // Travels with the file: the export outlives the page, and whoever opens
      // it downstream never saw the on-screen context.
      ...getExportDisclaimerCsvRows('pricing export'),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.setAttribute('href', url);
    link.setAttribute('download', `cloud-pricing-${activeProductType}-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[100dvh] lg:h-screen bg-[#f7f8ff] dark:bg-[#06060f] text-[#1e1e38] dark:text-[#e5e7eb] font-sans lg:overflow-hidden transition-colors duration-300">
      <h1 className="sr-only">Compare Cloud Costs - AWS, Azure, Google Cloud Pricing</h1>
      <Sidebar activeProductType={activeProductType} onProductTypeChange={setActiveProductType} />

      <div className="flex flex-1 min-w-0 flex-col lg:overflow-hidden">
      <div className="flex flex-1 lg:overflow-hidden">
        <FilterSidebar
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          activeProductType={activeProductType}
          facetCounts={facetCounts}
          selectedProviders={selectedProviders}
          selectedGeographies={selectedGeographies}
          selectedOS={selectedOS}
          selectedCpu={selectedCpu}
          selectedCategory={selectedCategory}
          selectedGpuModels={selectedGpuModels}
          selectedGpuVendors={selectedGpuVendors}
          selectedDbFamilies={selectedDbFamilies}
          selectedEngines={selectedEngines}
          selectedDeploymentTypes={selectedDeploymentTypes}
          selectedHaModes={selectedHaModes}
          selectedServerlessLanguages={selectedServerlessLanguages}
          selectedServerlessColdStart={selectedServerlessColdStart}
          selectedServerlessMemoryConfig={selectedServerlessMemoryConfig}
          selectedServerlessFreeTier={selectedServerlessFreeTier}
          selectedServerlessGranularity={selectedServerlessGranularity}
          selectedServerlessExecutionModel={selectedServerlessExecutionModel}
          selectedServerlessProvisionedConcurrency={selectedServerlessProvisionedConcurrency}
          selectedServerlessEphemeralStorage={selectedServerlessEphemeralStorage}
          selectedServerlessArchitectures={selectedServerlessArchitectures}
          selectedContainersOrchestrators={selectedContainersOrchestrators}
          selectedContainersComputeTypes={selectedContainersComputeTypes}
          selectedContainersArchitectures={selectedContainersArchitectures}
          selectedContainersBillingGranularity={selectedContainersBillingGranularity}
          selectedContainersServiceTypes={selectedContainersServiceTypes}
          selectedRegistryPricingComponent={selectedRegistryPricingComponent}
          selectedAnalyticsEngines={selectedAnalyticsEngines}
          selectedAnalyticsDeploymentTypes={selectedAnalyticsDeploymentTypes}
          selectedAnalyticsTiers={selectedAnalyticsTiers}
          selectedAiServiceTypes={selectedAiServiceTypes}
          selectedAiModelTiers={selectedAiModelTiers}
          selectedAiModalities={selectedAiModalities}
          selectedAiContextWindows={selectedAiContextWindows}
          selectedAiMultimodalOptions={selectedAiMultimodalOptions}
          selectedNetworkingServices={selectedNetworkingServices}
          selectedSecurityServices={selectedSecurityServices}
          selectedNetworkingConnectionTypes={selectedNetworkingConnectionTypes}
          selectedNetworkingRoutingTypes={selectedNetworkingRoutingTypes}
          selectedNetworkingHaSupport={selectedNetworkingHaSupport}
          selectedNetworkingVpcSupport={selectedNetworkingVpcSupport}
          selectedNetworkingDirections={selectedNetworkingDirections}
          selectedNetworkingBillingModels={selectedNetworkingBillingModels}
          selectedNetworkingUsageTiers={selectedNetworkingUsageTiers}
          selectedNetworkingPortCapacities={selectedNetworkingPortCapacities}
          selectedNetworkingTransferScopes={selectedNetworkingTransferScopes}
          selectedStorageCategories={selectedStorageCategories}
          selectedStorageTiers={selectedStorageTiers}
          selectedStorageRedundancies={selectedStorageRedundancies}
          selectedStorageMedia={selectedStorageMedia}
          selectedAppHostingTiers={selectedAppHostingTiers}
          selectedAppHostingComputeTypes={selectedAppHostingComputeTypes}
          selectedServerlessServiceTypes={selectedServerlessServiceTypes}
          selectedIntegrationServices={selectedIntegrationServices}
          selectedIntegrationPricingModels={selectedIntegrationPricingModels}
          selectedIntegrationTiers={selectedIntegrationTiers}
          selectedIntegrationSizes={selectedIntegrationSizes}
          selectedIntegrationProtocols={selectedIntegrationProtocols}
          vCpuRange={activeProductType === 'serverless' ? serverlessVCpuRange : activeProductType === 'containers' ? containersVCpuRange : vCpuRange}
          memoryRange={activeProductType === 'serverless' ? serverlessMemoryRange : activeProductType === 'containers' ? containersMemoryRange : memoryRange}
          serverlessTimeoutRange={serverlessTimeoutRange}
          priceRange={priceRange}
          outputPriceRange={outputPriceRange}
          gpuCountRange={gpuCountRange}
          showAggregation={showAggregation}
          expanded={expanded}
          onProviderToggle={(p) => toggleFilter(selectedProviders, setSelectedProviders, p)}
          onGeographyToggle={(g) => toggleFilter(selectedGeographies, setSelectedGeographies, g)}
          onOsToggle={(o) => toggleFilter(selectedOS, setSelectedOS, o)}
          onCpuToggle={(c) => toggleFilter(selectedCpu, setSelectedCpu, c)}
          onCategoryToggle={(c) => toggleFilter(selectedCategory, setSelectedCategory, c)}
          onSetCategory={setSelectedCategory}
          onGpuModelToggle={(v) => toggleFilter(selectedGpuModels, setSelectedGpuModels, v)}
          onSetGpuModel={setSelectedGpuModels}
          onGpuVendorToggle={(v) => toggleFilter(selectedGpuVendors, setSelectedGpuVendors, v)}
          onSetGpuVendor={setSelectedGpuVendors}
          onDbFamilyToggle={(f) => toggleFilter(selectedDbFamilies, setSelectedDbFamilies, f)}
          onEngineToggle={(e) => toggleFilter(selectedEngines, setSelectedEngines, e)}
          onDeploymentTypeToggle={(d) => toggleFilter(selectedDeploymentTypes, setSelectedDeploymentTypes, d)}
          onHaModeToggle={(h) => toggleFilter(selectedHaModes, setSelectedHaModes, h)}
          onServerlessLanguageToggle={(l) => toggleFilter(selectedServerlessLanguages, setSelectedServerlessLanguages, l)}
          onServerlessColdStartToggle={(o) => toggleFilter(selectedServerlessColdStart, setSelectedServerlessColdStart, o)}
          onServerlessMemoryConfigToggle={(m) => toggleFilter(selectedServerlessMemoryConfig, setSelectedServerlessMemoryConfig, m)}
          onServerlessFreeTierToggle={(f) => toggleFilter(selectedServerlessFreeTier, setSelectedServerlessFreeTier, f)}
          onServerlessGranularityToggle={(g) => toggleFilter(selectedServerlessGranularity, setSelectedServerlessGranularity, g)}
          onServerlessExecutionModelToggle={(e) => toggleFilter(selectedServerlessExecutionModel, setSelectedServerlessExecutionModel, e)}
          onServerlessProvisionedConcurrencyToggle={(p) => toggleFilter(selectedServerlessProvisionedConcurrency, setSelectedServerlessProvisionedConcurrency, p)}
          onServerlessEphemeralStorageToggle={(e) => toggleFilter(selectedServerlessEphemeralStorage, setSelectedServerlessEphemeralStorage, e)}
          onServerlessArchitectureToggle={(a) => toggleFilter(selectedServerlessArchitectures, setSelectedServerlessArchitectures, a)}
          onContainersOrchestratorToggle={(o) => toggleFilter(selectedContainersOrchestrators, setSelectedContainersOrchestrators, o)}
          onContainersComputeTypeToggle={(c) => toggleFilter(selectedContainersComputeTypes, setSelectedContainersComputeTypes, c)}
          onContainersArchitectureToggle={(a) => toggleFilter(selectedContainersArchitectures, setSelectedContainersArchitectures, a)}
          onContainersBillingGranularityToggle={(b) => toggleFilter(selectedContainersBillingGranularity, setSelectedContainersBillingGranularity, b)}
          onContainersServiceTypeToggle={(s) => toggleFilter(selectedContainersServiceTypes, setSelectedContainersServiceTypes, s)}
          onRegistryPricingComponentToggle={(p) => toggleFilter(selectedRegistryPricingComponent, setSelectedRegistryPricingComponent, p)}
          onAnalyticsEngineToggle={(e) => toggleFilter(selectedAnalyticsEngines, setSelectedAnalyticsEngines, e)}
          onAnalyticsDeploymentTypeToggle={(d) => toggleFilter(selectedAnalyticsDeploymentTypes, setSelectedAnalyticsDeploymentTypes, d)}
          onAnalyticsTierToggle={(t) => toggleFilter(selectedAnalyticsTiers, setSelectedAnalyticsTiers, t)}
          onAiServiceTypeToggle={(s) => toggleFilter(selectedAiServiceTypes, setSelectedAiServiceTypes, s)}
          onAiModelTierToggle={(m) => toggleFilter(selectedAiModelTiers, setSelectedAiModelTiers, m)}
          onAiModalityToggle={(m) => toggleFilter(selectedAiModalities, setSelectedAiModalities, m)}
          onAiContextWindowToggle={(c) => toggleFilter(selectedAiContextWindows, setSelectedAiContextWindows, c)}
          onAiMultimodalOptionToggle={(o) => toggleFilter(selectedAiMultimodalOptions, setSelectedAiMultimodalOptions, o)}
          onNetworkingServiceToggle={(s) => toggleFilter(selectedNetworkingServices, setSelectedNetworkingServices, s)}
          onSecurityServiceToggle={(s) => toggleFilter(selectedSecurityServices, setSelectedSecurityServices, s)}
          onSetSecurityServices={(items) => setSelectedSecurityServices(items)}
          onNetworkingConnectionTypeToggle={(c) => toggleFilter(selectedNetworkingConnectionTypes, setSelectedNetworkingConnectionTypes, c)}
          onNetworkingRoutingTypeToggle={(r) => toggleFilter(selectedNetworkingRoutingTypes, setSelectedNetworkingRoutingTypes, r)}
          onNetworkingHaSupportToggle={(h) => toggleFilter(selectedNetworkingHaSupport, setSelectedNetworkingHaSupport, h)}
          onNetworkingVpcSupportToggle={(v) => toggleFilter(selectedNetworkingVpcSupport, setSelectedNetworkingVpcSupport, v)}
          onNetworkingDirectionToggle={(d) => toggleFilter(selectedNetworkingDirections, setSelectedNetworkingDirections, d)}
          onNetworkingBillingModelToggle={(b) => toggleFilter(selectedNetworkingBillingModels, setSelectedNetworkingBillingModels, b)}
          onNetworkingUsageTierToggle={(u) => toggleFilter(selectedNetworkingUsageTiers, setSelectedNetworkingUsageTiers, u)}
          onNetworkingPortCapacityToggle={(p) => toggleFilter(selectedNetworkingPortCapacities, setSelectedNetworkingPortCapacities, p)}
          onNetworkingTransferScopeToggle={(s) => toggleFilter(selectedNetworkingTransferScopes, setSelectedNetworkingTransferScopes, s)}
          onStorageCategoryToggle={(c) => toggleFilter(selectedStorageCategories, setSelectedStorageCategories, c)}
          onStorageTierToggle={(t) => toggleFilter(selectedStorageTiers, setSelectedStorageTiers, t)}
          onStorageRedundancyToggle={(r) => toggleFilter(selectedStorageRedundancies, setSelectedStorageRedundancies, r)}
          onStorageMediaToggle={(m) => toggleFilter(selectedStorageMedia, setSelectedStorageMedia, m)}
          onAppHostingTierToggle={(t) => toggleFilter(selectedAppHostingTiers, setSelectedAppHostingTiers, t)}
          onAppHostingComputeTypeToggle={(c) => toggleFilter(selectedAppHostingComputeTypes, setSelectedAppHostingComputeTypes, c)}
          onServerlessServiceTypeToggle={(s) => toggleFilter(selectedServerlessServiceTypes, setSelectedServerlessServiceTypes, s)}
          onIntegrationServiceToggle={(s) => toggleFilter(selectedIntegrationServices, setSelectedIntegrationServices, s)}
          onIntegrationPricingModelToggle={(s) => toggleFilter(selectedIntegrationPricingModels, setSelectedIntegrationPricingModels, s)}
          onIntegrationTierToggle={(t) => toggleFilter(selectedIntegrationTiers, setSelectedIntegrationTiers, t)}
          onIntegrationSizeToggle={(s) => toggleFilter(selectedIntegrationSizes, setSelectedIntegrationSizes, s)}
          onIntegrationProtocolToggle={(p) => toggleFilter(selectedIntegrationProtocols, setSelectedIntegrationProtocols, p)}
          onSetProviders={setSelectedProviders}
          onSetGeographies={setSelectedGeographies}
          onSetOS={setSelectedOS}
          onSetCpu={setSelectedCpu}
          onSetDbFamilies={setSelectedDbFamilies}
          onSetEngines={setSelectedEngines}
          onSetDeploymentTypes={setSelectedDeploymentTypes}
          onSetHaModes={setSelectedHaModes}
          onSetServerlessLanguages={setSelectedServerlessLanguages}
          onSetServerlessColdStart={setSelectedServerlessColdStart}
          onSetServerlessMemoryConfig={setSelectedServerlessMemoryConfig}
          onSetServerlessFreeTier={setSelectedServerlessFreeTier}
          onSetServerlessGranularity={setSelectedServerlessGranularity}
          onSetServerlessExecutionModel={setSelectedServerlessExecutionModel}
          onSetServerlessProvisionedConcurrency={setSelectedServerlessProvisionedConcurrency}
          onSetServerlessEphemeralStorage={setSelectedServerlessEphemeralStorage}
          onSetServerlessArchitectures={setSelectedServerlessArchitectures}
          onSetContainersOrchestrators={setSelectedContainersOrchestrators}
          onSetContainersComputeTypes={setSelectedContainersComputeTypes}
          onSetContainersArchitectures={setSelectedContainersArchitectures}
          onSetContainersBillingGranularity={setSelectedContainersBillingGranularity}
          onSetContainersServiceTypes={setSelectedContainersServiceTypes}
          onSetRegistryPricingComponent={setSelectedRegistryPricingComponent}
          onSetAnalyticsEngines={setSelectedAnalyticsEngines}
          onSetAnalyticsDeploymentTypes={setSelectedAnalyticsDeploymentTypes}
          onSetAnalyticsTiers={setSelectedAnalyticsTiers}
          onSetAiServiceTypes={setSelectedAiServiceTypes}
          onSetAiModelTiers={setSelectedAiModelTiers}
          onSetAiModalities={setSelectedAiModalities}
          onSetAiContextWindows={setSelectedAiContextWindows}
          onSetAiMultimodalOptions={setSelectedAiMultimodalOptions}
          onSetNetworkingServices={setSelectedNetworkingServices}
          onSetNetworkingConnectionTypes={setSelectedNetworkingConnectionTypes}
          onSetNetworkingRoutingTypes={setSelectedNetworkingRoutingTypes}
          onSetNetworkingHaSupport={setSelectedNetworkingHaSupport}
          onSetNetworkingVpcSupport={setSelectedNetworkingVpcSupport}
          onSetNetworkingDirections={setSelectedNetworkingDirections}
          onSetNetworkingBillingModels={setSelectedNetworkingBillingModels}
          onSetNetworkingUsageTiers={setSelectedNetworkingUsageTiers}
          onSetNetworkingPortCapacities={setSelectedNetworkingPortCapacities}
          onSetNetworkingTransferScopes={setSelectedNetworkingTransferScopes}
          onSetStorageCategories={setSelectedStorageCategories}
          onSetStorageTiers={setSelectedStorageTiers}
          onSetStorageRedundancies={setSelectedStorageRedundancies}
          onSetStorageMedia={setSelectedStorageMedia}
          onSetAppHostingTiers={setSelectedAppHostingTiers}
          onSetAppHostingComputeTypes={setSelectedAppHostingComputeTypes}
          onSetServerlessServiceTypes={setSelectedServerlessServiceTypes}
          onSetIntegrationServices={setSelectedIntegrationServices}
          onSetIntegrationPricingModels={setSelectedIntegrationPricingModels}
          onSetIntegrationTiers={setSelectedIntegrationTiers}
          onSetIntegrationSizes={setSelectedIntegrationSizes}
          onSetIntegrationProtocols={setSelectedIntegrationProtocols}
          onVCpuRangeChange={activeProductType === 'serverless' ? setServerlessVCpuRange : activeProductType === 'containers' ? setContainersVCpuRange : setVCpuRange}
          onMemoryRangeChange={activeProductType === 'serverless' ? setServerlessMemoryRange : activeProductType === 'containers' ? setContainersMemoryRange : setMemoryRange}
          onServerlessTimeoutRangeChange={setServerlessTimeoutRange}
          onPriceRangeChange={setPriceRange}
          onOutputPriceRangeChange={setOutputPriceRange}
          onGpuCountRangeChange={setGpuCountRange}
          onShowAggregationChange={setShowAggregation}
          onToggleSection={toggleSection}
        />

        <main className="flex-1 min-w-0 lg:overflow-hidden flex flex-col bg-[#f7f8ff] dark:bg-[#06060f]">
          <ProviderCards
            // Hyperscalers first, then specialized, alphabetical within each —
            // see compareProvidersForDisplay. Copied before sorting so the
            // shared PROVIDERS config isn't reordered for other consumers.
            providers={[...staticConfig.providersForType(activeProductType)].sort(staticConfig.compareProvidersForDisplay)}
            selectedProviders={selectedProviders}
            providerCounts={providerCounts}
            dbStatusProviders={dbStatus?.providers}
            isInitialFetch={isInitialFetch}
            onProviderSelect={(providerId) => {
              // Clicking the single isolated provider clears back to unconstrained ([]),
              // which keeps the sidebar checkboxes consistent — listing every provider
              // here instead would tick all the boxes and misrepresent it as a filter.
              if (selectedProviders.includes(providerId) && selectedProviders.length === 1) {
                setSelectedProviders([]);
              } else {
                setSelectedProviders([providerId]);
              }
            }}
          />

          <CategorySummaryTable
            data={data}
            activeProductType={activeProductType}
            loading={loading}
          />

          <TableToolbar
            totalFilteredCount={totalFilteredCount}
            dataLength={data.length}
            search={search}
            onSearchChange={setSearch}
            onExport={handleExport}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenFilters={() => setFiltersOpen(true)}
            lastUpdated={lastUpdated}
          />

          {viewMode === 'table' ? (
            <PricingTable
              data={data}
              loading={loading}
              activeProductType={activeProductType}
              showAggregation={showAggregation}
              tableScrollRef={tableScrollRef}
              hasHorizontalOverflow={hasHorizontalOverflow}
              scrolledToEnd={scrolledToEnd}
              sortConfig={sortConfig}
              onHeaderClick={handleHeaderClick}
              lastUpdated={lastUpdated}
            />
          ) : (
            <ChartsView
              data={data}
              activeProductType={activeProductType}
            />
          )}
        </main>
      </div>

      <Footer />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @supports not selector(::-webkit-scrollbar) {
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #737373 #d4d4d4;
          }
          .dark .custom-scrollbar {
              scrollbar-color: #a3a3a3 #262626;
            }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 14px !important;
          height: 14px !important;
          -webkit-appearance: none !important;
          background: #d4d4d4 !important;
        }
        .dark .custom-scrollbar::-webkit-scrollbar { background: #262626 !important; }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #d4d4d4 !important;
          border-top: 1px solid #a3a3a3 !important;
          border-left: 1px solid #a3a3a3 !important;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
            background: #262626 !important;
            border-top: 1px solid #404040 !important;
            border-left: 1px solid #404040 !important;
          }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #737373 !important;
          border-radius: 7px !important;
          border: 2px solid #d4d4d4 !important;
          min-width: 40px !important;
          min-height: 40px !important;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #a3a3a3 !important;
            border: 2px solid #262626 !important;
          }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #525252 !important; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4d4d4 !important; }
        .custom-scrollbar::-webkit-scrollbar-corner { background: #d4d4d4 !important; }
        .dark .custom-scrollbar::-webkit-scrollbar-corner { background: #262626 !important; }
        .scroll-fade-right {
          position: relative;
        }
        .scroll-fade-right::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 24px;
          height: 100%;
          pointer-events: none;
          background: linear-gradient(to right, rgba(255,255,255,0), rgba(0,0,0,0.12));
          z-index: 5;
        }
        .dark .scroll-fade-right::after {
            background: linear-gradient(to right, rgba(0,0,0,0), rgba(255,255,255,0.18));
          }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[type="range"].absolute {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          pointer-events: none;
        }
        input[type="range"].absolute::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          border: 1px solid #d4d4d4;
        }
        .dark input[type="range"].absolute::-webkit-slider-thumb {
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          border: 1px solid #404040;
        }
        input[type="range"].absolute::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: auto;
          border: 1px solid #d4d4d4;
        }
        .dark input[type="range"].absolute::-moz-range-thumb {
          border: 1px solid #404040;
        }
        .slider-input-min {
          z-index: 30;
        }
        .slider-input-max {
          z-index: 20;
        }
      `}} />

      <FeedbackToast
        feature="product-filters"
        active={hasActiveFilters && !loading}
        context={activeProductType}
      />
    </div>
  );
}
