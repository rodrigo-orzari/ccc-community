'use client';

import React, { useEffect, useRef } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import type { ProductType } from '@/types';
import { RangeSlider } from './RangeSlider';
import {
  Tooltip,
  CheckboxFilterSection,
  GroupedCheckboxFilterSection,
} from './FilterControls';

// Import all filter constants from config
import { useDynamicFilters } from '@/hooks/useDynamicFilters';
import * as staticConfig from '@/config';
import { GPU_MODEL_SPECS } from '@/config/gpu_models';

const ENGINE_CATEGORIES: Record<string, string[]> = {
  'Relational': ['MySQL', 'PostgreSQL', 'SQL Server', 'Oracle DB', 'MariaDB', 'DB2', 'Db2', 'MySQL (on-premise for Outpost)', 'PostgreSQL (on-premise for Outpost)', 'SQL Server (on-premise for Outpost)', 'Oracle (on-premises for Outposts)'],
  'Data Warehouse & Analytics': ['BigQuery', 'Snowflake', 'Redshift', 'Databricks', 'Synapse', 'Oracle Autonomous Data Warehouse', 'Oracle Analytics Cloud', 'AnalyticDB for MySQL', 'MaxCompute', 'Hologres', 'E-MapReduce'],
  'NoSQL & In-Memory': ['MongoDB', 'Cosmos DB', 'Redis', 'Valkey'],
  'Vector': ['Pinecone', 'Milvus', 'Qdrant', 'Weaviate', 'Chroma'],
  'Streaming & Search': ['Kafka', 'Kinesis Data Streams', 'Pub/Sub', 'Event Hubs', 'OpenSearch']
};

const ANALYTICS_ENGINE_CATEGORIES: Record<string, string[]> = {
  'Cloud Data Warehouses': ['BigQuery', 'Redshift', 'Synapse', 'Microsoft Fabric', 'Snowflake'],
  'Provisioned Platforms': ['Databricks', 'Oracle Analytics Cloud', 'Oracle Autonomous Data Warehouse'],
  'Open-Source & Other': ['Hologres', 'AnalyticDB for MySQL', 'MaxCompute', 'E-MapReduce', 'OpenSearch'],
  'Streaming Platforms': ['Kafka', 'ApsaraMQ for Kafka', 'Event Hubs', 'Kinesis Data Streams', 'OCI Streaming', 'Pub/Sub']
};

const groupEngines = (engines: string[]) => {
  const groups: { label: string; services: string[] }[] = [
    { label: 'Relational', services: [] },
    { label: 'Data Warehouse & Analytics', services: [] },
    { label: 'NoSQL & In-Memory', services: [] },
    { label: 'Vector', services: [] },
    { label: 'Streaming & Search', services: [] },
    { label: 'Other', services: [] }
  ];

  engines.forEach(eng => {
    let matched = false;
    for (const [category, list] of Object.entries(ENGINE_CATEGORIES)) {
      if (list.includes(eng)) {
        groups.find(g => g.label === category)?.services.push(eng);
        matched = true;
        break;
      }
    }
    if (!matched) {
      groups.find(g => g.label === 'Other')?.services.push(eng);
    }
  });

  return groups.filter(g => g.services.length > 0);
};

const groupAnalyticsEngines = (engines: string[]) => {
  const groups: { label: string; services: string[] }[] = [
    { label: 'Cloud Data Warehouses', services: [] },
    { label: 'Provisioned Platforms', services: [] },
    { label: 'Open-Source & Other', services: [] },
    { label: 'Streaming Platforms', services: [] },
    { label: 'Other', services: [] }
  ];

  engines.forEach(eng => {
    let matched = false;
    for (const [category, list] of Object.entries(ANALYTICS_ENGINE_CATEGORIES)) {
      if (list.includes(eng)) {
        groups.find(g => g.label === category)?.services.push(eng);
        matched = true;
        break;
      }
    }
    if (!matched) {
      groups.find(g => g.label === 'Other')?.services.push(eng);
    }
  });

  return groups.filter(g => g.services.length > 0);
};

// Formats tier labels by stripping redundant prefixes. Used for display only;
// the original tier string is retained for filtering logic.
const formatAnalyticsTierLabel = (tier: string): string => {
  // Strip "Capacity " prefix from Synapse capacity units: "Capacity F2" → "F2"
  if (/^capacity\s+/i.test(tier)) return tier.replace(/^capacity\s+/i, '');
  // Strip " Node" suffix from Redshift compute nodes: "DC2 Node" → "DC2", "RA3 Node" → "RA3"
  if (/\s+node$/i.test(tier)) return tier.replace(/\s+node$/i, '');
  // Return as-is for other tiers (Standard, Enterprise, On-Demand, etc.)
  return tier;
};

// Canonical edition buckets for Data & Analytics tiers. Vendors name equivalent
// capability tiers differently — Snowflake "Enterprise", BigQuery "Enterprise
// Edition" / "Enterprise Plus", Databricks "Premium" — which produced a wall of
// near-duplicate buttons. We collapse the raw values into one canonical button per
// concept; the results table still shows each product's exact tier string.
const ANALYTICS_TIER_CANONICAL: { canonical: string; matches: RegExp }[] = [
  { canonical: 'Standard',          matches: /^standard(\s+edition)?$/i },
  { canonical: 'Premium',           matches: /^premium$/i },
  { canonical: 'Enterprise',        matches: /^enterprise(\s+(edition|plus))?$/i },
  { canonical: 'Business Critical', matches: /^business critical$/i },
];
const ANALYTICS_TIER_EDITION_ORDER = ['Standard', 'Premium', 'Enterprise', 'Business Critical'];

// Builds the grouped button model for the Tier filter. Editions are shown as
// canonical buttons that each control one or more raw tier values (returned in
// `optionValues`); capacity units, compute nodes and billing models pass through
// unchanged (one button per raw value). Selection state stays as raw tier strings
// so the API/DB query and client-side filtering are untouched.
const buildAnalyticsTierModel = (rawTiers: string[]) => {
  const optionValues: Record<string, string[]> = {};
  const editions: string[] = [];
  const capacity: string[] = [];
  const nodes: string[] = [];
  const billing: string[] = [];
  const other: string[] = [];

  rawTiers.forEach(t => {
    if (/^capacity\s+f\d+/i.test(t)) { capacity.push(t); optionValues[t] = [t]; }
    else if (/\bnode\b/i.test(t)) { nodes.push(t); optionValues[t] = [t]; }
    else if (/^(on-demand|provisioned|serverless)$/i.test(t)) { billing.push(t); optionValues[t] = [t]; }
    else {
      const c = ANALYTICS_TIER_CANONICAL.find(x => x.matches.test(t));
      if (c) {
        (optionValues[c.canonical] ||= []).push(t);
        if (!editions.includes(c.canonical)) editions.push(c.canonical);
      } else { other.push(t); optionValues[t] = [t]; }
    }
  });

  capacity.sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0));
  editions.sort((a, b) => ANALYTICS_TIER_EDITION_ORDER.indexOf(a) - ANALYTICS_TIER_EDITION_ORDER.indexOf(b));

  const groups = [
    { label: 'Editions', services: editions },
    { label: 'Capacity Units', services: capacity },
    { label: 'Compute Nodes', services: nodes },
    { label: 'Billing Model', services: billing },
    { label: 'Other', services: other },
  ].filter(g => g.services.length > 0);

  return { groups, optionValues };
};

// Filter controls are shared site-wide (catalog, compliance, datacenters, workloads)
// so the interaction model stays identical everywhere. See ./FilterControls.tsx.
// These aliases keep the existing call sites in this file unchanged.
const FilterSection = CheckboxFilterSection;
const GroupedFilterSection = GroupedCheckboxFilterSection;

interface FilterSidebarProps {
  activeProductType: ProductType;
  // Per-option result counts keyed by facet name then option value, e.g.
  // { provider: { aws: 1840 }, geography: { 'S. America': 420 } }. Supplied by
  // /api/facets; any facet absent from the map simply renders without counts.
  facetCounts?: Record<string, Record<string, number>>;
  selectedProviders: string[];
  selectedGeographies: string[];
  selectedOS: string[];
  selectedCpu: string[];
  selectedCategory: string[];
  selectedGpuModels: string[];
  selectedGpuVendors: string[];
  selectedDbFamilies: string[];
  selectedEngines: string[];
  selectedDeploymentTypes: string[];
  selectedHaModes: string[];
  selectedServerlessLanguages: string[];
  selectedServerlessColdStart: string[];
  selectedServerlessMemoryConfig: string[];
  selectedServerlessFreeTier: string[];
  selectedServerlessGranularity: string[];
  selectedServerlessExecutionModel: string[];
  selectedServerlessProvisionedConcurrency: string[];
  selectedServerlessEphemeralStorage: string[];
  selectedServerlessArchitectures: string[];
  selectedContainersOrchestrators: string[];
  selectedContainersServiceTypes: string[];
  selectedContainersComputeTypes: string[];
  selectedContainersArchitectures: string[];
  selectedContainersBillingGranularity: string[];
  selectedAnalyticsEngines: string[];
  selectedAnalyticsDeploymentTypes: string[];
  selectedAnalyticsTiers: string[];
  selectedAiServiceTypes: string[];
  selectedAiModelTiers: string[];
  selectedAiModalities: string[];
  selectedAiContextWindows: string[];
  selectedAiMultimodalOptions: string[];
  selectedNetworkingServices: string[];
  selectedNetworkingConnectionTypes: string[];
  selectedNetworkingRoutingTypes: string[];
  selectedNetworkingHaSupport: string[];
  selectedNetworkingVpcSupport: string[];
  selectedNetworkingDirections: string[];
  selectedSecurityServices: string[];
  selectedNetworkingBillingModels: string[];
  selectedNetworkingUsageTiers: string[];
  selectedNetworkingPortCapacities: string[];
  selectedNetworkingTransferScopes: string[];
  selectedStorageCategories: string[];
  selectedStorageTiers: string[];
  selectedStorageRedundancies: string[];
  selectedStorageMedia: string[];
  selectedAppHostingTiers: string[];
  selectedAppHostingComputeTypes: string[];
  selectedServerlessServiceTypes: string[];
  vCpuRange: { min: number; max: number };
  memoryRange: { min: number; max: number };
  priceRange: { min: number; max: number };
  outputPriceRange: { min: number; max: number };
  showAggregation: boolean;
  expanded: Record<string, boolean>;
  // Handlers
  onProviderToggle: (providerId: string) => void;
  onGeographyToggle: (geo: string) => void;
  onOsToggle: (os: string) => void;
  onCpuToggle: (cpu: string) => void;
  onCategoryToggle: (cat: string) => void;
  onSetCategory: (items: string[]) => void;
  onGpuModelToggle: (value: string) => void;
  onSetGpuModel: (items: string[]) => void;
  onGpuVendorToggle: (value: string) => void;
  onSetGpuVendor: (items: string[]) => void;
  onDbFamilyToggle: (fam: string) => void;
  onEngineToggle: (eng: string) => void;
  onDeploymentTypeToggle: (dt: string) => void;
  onHaModeToggle: (hm: string) => void;
  onServerlessLanguageToggle: (lang: string) => void;
  onServerlessColdStartToggle: (opt: string) => void;
  onServerlessMemoryConfigToggle: (opt: string) => void;
  onServerlessFreeTierToggle: (opt: string) => void;
  onServerlessGranularityToggle: (opt: string) => void;
  onServerlessExecutionModelToggle: (opt: string) => void;
  onServerlessProvisionedConcurrencyToggle: (opt: string) => void;
  onServerlessEphemeralStorageToggle: (opt: string) => void;
  onServerlessArchitectureToggle: (opt: string) => void;
  onContainersOrchestratorToggle: (opt: string) => void;
  onContainersServiceTypeToggle: (opt: string) => void;
  onContainersComputeTypeToggle: (opt: string) => void;
  onContainersArchitectureToggle: (opt: string) => void;
  onContainersBillingGranularityToggle: (opt: string) => void;
  onAnalyticsEngineToggle: (eng: string) => void;
  onAnalyticsDeploymentTypeToggle: (dt: string) => void;
  onAnalyticsTierToggle: (tier: string) => void;
  onSecurityServiceToggle: (s: string) => void;
  onSetSecurityServices: (items: string[]) => void;
  onAiServiceTypeToggle: (val: string) => void;
  onAiModelTierToggle: (val: string) => void;
  onAiModalityToggle: (val: string) => void;
  onAiContextWindowToggle: (val: string) => void;
  onAiMultimodalOptionToggle: (val: string) => void;
  onNetworkingServiceToggle: (svc: string) => void;
  onNetworkingConnectionTypeToggle: (ct: string) => void;
  onNetworkingRoutingTypeToggle: (rt: string) => void;
  onNetworkingHaSupportToggle: (opt: string) => void;
  onNetworkingVpcSupportToggle: (opt: string) => void;
  onNetworkingDirectionToggle: (opt: string) => void;
  onNetworkingBillingModelToggle: (opt: string) => void;
  onNetworkingUsageTierToggle: (opt: string) => void;
  onNetworkingPortCapacityToggle: (opt: string) => void;
  onNetworkingTransferScopeToggle: (opt: string) => void;
  onStorageCategoryToggle: (opt: string) => void;
  onStorageTierToggle: (opt: string) => void;
  onStorageRedundancyToggle: (opt: string) => void;
  onStorageMediaToggle: (opt: string) => void;
  onAppHostingTierToggle: (opt: string) => void;
  onAppHostingComputeTypeToggle: (opt: string) => void;
  onServerlessServiceTypeToggle: (opt: string) => void;
  // Batch setters for Select All / Clear All
  onSetProviders: (items: string[]) => void;
  onSetGeographies: (items: string[]) => void;
  onSetOS: (items: string[]) => void;
  onSetCpu: (items: string[]) => void;
  onSetDbFamilies: (items: string[]) => void;
  onSetEngines: (items: string[]) => void;
  onSetDeploymentTypes: (items: string[]) => void;
  onSetHaModes: (items: string[]) => void;
  onSetServerlessLanguages: (items: string[]) => void;
  onSetServerlessColdStart: (items: string[]) => void;
  onSetServerlessMemoryConfig: (items: string[]) => void;
  onSetServerlessFreeTier: (items: string[]) => void;
  onSetServerlessGranularity: (items: string[]) => void;
  onSetServerlessExecutionModel: (items: string[]) => void;
  onSetServerlessProvisionedConcurrency: (items: string[]) => void;
  onSetServerlessEphemeralStorage: (items: string[]) => void;
  onSetServerlessArchitectures: (items: string[]) => void;
  onSetContainersOrchestrators: (items: string[]) => void;
  onSetContainersServiceTypes: (items: string[]) => void;
  onSetContainersComputeTypes: (items: string[]) => void;
  onSetContainersArchitectures: (items: string[]) => void;
  onSetContainersBillingGranularity: (items: string[]) => void;
  onSetAnalyticsEngines: (items: string[]) => void;
  onSetAnalyticsDeploymentTypes: (items: string[]) => void;
  onSetAnalyticsTiers: (items: string[]) => void;
  onSetAiServiceTypes: (items: string[]) => void;
  onSetAiModelTiers: (items: string[]) => void;
  onSetAiModalities: (items: string[]) => void;
  onSetAiContextWindows: (items: string[]) => void;
  onSetAiMultimodalOptions: (items: string[]) => void;
  onSetNetworkingServices: (items: string[]) => void;
  onSetNetworkingConnectionTypes: (items: string[]) => void;
  onSetNetworkingRoutingTypes: (items: string[]) => void;
  onSetNetworkingHaSupport: (items: string[]) => void;
  onSetNetworkingVpcSupport: (items: string[]) => void;
  onSetNetworkingDirections: (items: string[]) => void;
  onSetNetworkingBillingModels: (items: string[]) => void;
  onSetNetworkingUsageTiers: (items: string[]) => void;
  onSetNetworkingPortCapacities: (items: string[]) => void;
  onSetNetworkingTransferScopes: (items: string[]) => void;
  onSetStorageCategories: (items: string[]) => void;
  onSetStorageTiers: (items: string[]) => void;
  onSetStorageRedundancies: (items: string[]) => void;
  onSetStorageMedia: (items: string[]) => void;
  onSetAppHostingTiers: (items: string[]) => void;
  onSetAppHostingComputeTypes: (items: string[]) => void;
  onSetServerlessServiceTypes: (items: string[]) => void;
  selectedIntegrationServices: string[];
  selectedIntegrationPricingModels: string[];
  selectedIntegrationTiers: string[];
  selectedIntegrationSizes: string[];
  selectedIntegrationProtocols: string[];
  selectedRegistryPricingComponent?: string[];
  onRegistryPricingComponentToggle?: (opt: string) => void;
  onSetRegistryPricingComponent?: (items: string[]) => void;
  onIntegrationServiceToggle: (item: string) => void;
  onIntegrationPricingModelToggle: (item: string) => void;
  onIntegrationTierToggle: (item: string) => void;
  onIntegrationSizeToggle: (item: string) => void;
  onIntegrationProtocolToggle: (item: string) => void;
  onSetIntegrationServices: (items: string[]) => void;
  onSetIntegrationPricingModels: (items: string[]) => void;
  onSetIntegrationTiers: (items: string[]) => void;
  onSetIntegrationSizes: (items: string[]) => void;
  onSetIntegrationProtocols: (items: string[]) => void;
  onVCpuRangeChange: (range: { min: number; max: number }) => void;
  onMemoryRangeChange: (range: { min: number; max: number }) => void;
  serverlessTimeoutRange: { min: number; max: number };
  onServerlessTimeoutRangeChange: (range: { min: number; max: number }) => void;
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  onOutputPriceRangeChange: (range: { min: number; max: number }) => void;
  gpuCountRange: { min: number; max: number };
  onGpuCountRangeChange: (range: { min: number; max: number }) => void;
  onShowAggregationChange: (value: boolean) => void;
  onToggleSection: (key: string) => void;
  /** Mobile drawer: whether the sidebar is open (ignored on lg+ where it's always visible). */
  isOpen?: boolean;
  /** Mobile drawer: called when the backdrop or close button is tapped. */
  onClose?: () => void;
}

// One-line intro shown at the top of the sidebar for each product category,
// explaining what the page compares (~250–280 chars). Keyed by ProductType.
const PRODUCT_TYPE_DESCRIPTIONS: Record<ProductType, string> = {
  vm: 'Compare virtual machine pricing across clouds — general-purpose, compute-, memory-, and storage-optimized instances. Filter by vCPU, RAM, CPU vendor, architecture, and OS to find the cheapest equivalent instance for your workload in each region.',
  gpu: 'Compare GPU instance pricing across clouds — NVIDIA H100/H200/A100/L40S/L4, AMD MI300X, and more. Filter by GPU model, GPU count, vCPU, and RAM to find the cheapest way to get a given accelerator in each region.',
  database: 'Compare managed database pricing across clouds — relational, NoSQL, in-memory, and vector engines. Filter by engine, deployment type, high-availability mode, vCPU, and RAM to line up equivalent offerings and find the lowest cost per configuration.',
  serverless: 'Compare serverless function pricing across clouds — per-request and per-GB-second billing for event-driven workloads. Filter by runtime, memory, timeout, architecture, cold-start behavior, and free tier to estimate real function costs across providers.',
  containers: 'Compare managed container and Kubernetes pricing across clouds — control planes, node pools, and serverless container runtimes. Filter by orchestrator, compute type, architecture, GPU, and billing granularity to compare equivalent platforms side by side.',
  networking: 'Compare cloud networking pricing across providers — load balancers, VPN, CDN, and data transfer. Filter by service, connection and routing type, HA and VPC support, direction, and billing model to understand often-overlooked networking and egress costs.',
  storage: 'Compare cloud storage pricing across providers — object, block, file, and archive tiers. Filter by storage type, tier, redundancy, and media to compare capacity pricing and find the cheapest option for hot, warm, or cold data in each region.',
  'data-analytics': 'Compare data and analytics pricing across clouds — data warehouses, streaming, and Spark/Databricks platforms. Filter by engine, deployment type, and tier to compare services, with regional multipliers reflecting how costs shift by geography.',
  ai: 'Compare AI and machine-learning pricing across providers — foundation models and inference endpoints. Filter by service type, model tier, context window, and multimodal support to compare input and output token pricing across model families side by side.',
  'app-hosting': 'Compare application hosting (PaaS) pricing across clouds — App Engine, App Runner, and similar platforms. Filter by tier, compute type, OS, vCPU, and RAM to compare fully managed app-hosting plans and find the cheapest fit for your service.',
  security: 'Compare security and identity pricing across providers — managed services for identity, secrets, threat detection, and more. Filter by service and provider to line up equivalent offerings and understand what each cloud charges for comparable capabilities.',
  integration: 'Compare integration and messaging pricing across clouds — message queues, event buses, API gateways, and workflows. Filter by service type and tier to find the cheapest way to connect your systems.',
};

export default function FilterSidebar({
  activeProductType,
  facetCounts = {},
  selectedProviders,
  selectedGeographies,
  selectedOS,
  selectedCpu,
  selectedCategory,
  selectedGpuModels,
  selectedGpuVendors,
  selectedDbFamilies,
  selectedEngines,
  selectedDeploymentTypes,
  selectedHaModes,
  selectedServerlessLanguages,
  selectedServerlessColdStart,
  selectedServerlessMemoryConfig,
  selectedServerlessFreeTier,
  selectedServerlessGranularity,
  selectedServerlessExecutionModel,
  selectedServerlessProvisionedConcurrency,
  selectedServerlessEphemeralStorage,
  selectedServerlessArchitectures,
  selectedContainersOrchestrators,
  selectedContainersServiceTypes,
  selectedContainersComputeTypes,
  selectedContainersArchitectures,
  selectedContainersBillingGranularity,
  selectedAnalyticsEngines,
  selectedAnalyticsDeploymentTypes,
  selectedAnalyticsTiers,
  selectedAiServiceTypes,
  selectedAiModelTiers,
  selectedAiModalities,
  selectedAiContextWindows,
  selectedAiMultimodalOptions,
  selectedNetworkingServices,
  selectedNetworkingConnectionTypes,
  selectedNetworkingRoutingTypes,
  selectedNetworkingHaSupport,
  selectedNetworkingVpcSupport,
  selectedNetworkingDirections,
  selectedSecurityServices,
  selectedNetworkingBillingModels,
  selectedNetworkingUsageTiers,
  selectedNetworkingPortCapacities,
  selectedNetworkingTransferScopes,
  selectedStorageCategories,
  selectedStorageTiers,
  selectedStorageRedundancies,
  selectedStorageMedia,
  selectedAppHostingTiers,
  selectedAppHostingComputeTypes,
  selectedServerlessServiceTypes,
  selectedIntegrationServices,
  selectedIntegrationPricingModels,
  selectedIntegrationTiers,
  selectedIntegrationSizes,
  selectedIntegrationProtocols,
  selectedRegistryPricingComponent,
  onRegistryPricingComponentToggle,
  onSetRegistryPricingComponent,
  vCpuRange,
  memoryRange,
  serverlessTimeoutRange,
  priceRange,
  outputPriceRange,
  gpuCountRange,
  showAggregation,
  expanded,
  onProviderToggle,
  onGeographyToggle,
  onOsToggle,
  onCpuToggle,
  onCategoryToggle,
  onSetCategory,
  onGpuModelToggle,
  onSetGpuModel,
  onGpuVendorToggle,
  onSetGpuVendor,
  onDbFamilyToggle,
  onEngineToggle,
  onDeploymentTypeToggle,
  onHaModeToggle,
  onServerlessLanguageToggle,
  onServerlessColdStartToggle,
  onServerlessMemoryConfigToggle,
  onServerlessFreeTierToggle,
  onServerlessGranularityToggle,
  onServerlessExecutionModelToggle,
  onServerlessProvisionedConcurrencyToggle,
  onServerlessEphemeralStorageToggle,
  onServerlessArchitectureToggle,
  onContainersOrchestratorToggle,
  onContainersServiceTypeToggle,
  onContainersComputeTypeToggle,
  onContainersArchitectureToggle,
  onContainersBillingGranularityToggle,
  onAnalyticsEngineToggle,
  onAnalyticsDeploymentTypeToggle,
  onAnalyticsTierToggle,
  onSetAnalyticsTiers,
  onSecurityServiceToggle,
  onSetSecurityServices,
  onAiServiceTypeToggle,
  onAiModelTierToggle,
  onAiModalityToggle,
  onAiContextWindowToggle,
  onAiMultimodalOptionToggle,
  onNetworkingServiceToggle,
  onNetworkingConnectionTypeToggle,
  onNetworkingRoutingTypeToggle,
  onNetworkingHaSupportToggle,
  onNetworkingVpcSupportToggle,
  onNetworkingDirectionToggle,
  onNetworkingBillingModelToggle,
  onNetworkingUsageTierToggle,
  onNetworkingPortCapacityToggle,
  onNetworkingTransferScopeToggle,
  onStorageCategoryToggle,
  onStorageTierToggle,
  onStorageRedundancyToggle,
  onStorageMediaToggle,
  onAppHostingTierToggle,
  onAppHostingComputeTypeToggle,
  onServerlessServiceTypeToggle,
  onIntegrationServiceToggle,
  onIntegrationPricingModelToggle,
  onIntegrationTierToggle,
  onIntegrationSizeToggle,
  onIntegrationProtocolToggle,
  onSetProviders,
  onSetGeographies,
  onSetOS,
  onSetCpu,
  onSetDbFamilies,
  onSetEngines,
  onSetDeploymentTypes,
  onSetHaModes,
  onSetServerlessLanguages,
  onSetServerlessColdStart,
  onSetServerlessMemoryConfig,
  onSetServerlessFreeTier,
  onSetServerlessGranularity,
  onSetServerlessExecutionModel,
  onSetServerlessProvisionedConcurrency,
  onSetServerlessEphemeralStorage,
  onSetServerlessArchitectures,
  onSetContainersOrchestrators,
  onSetContainersServiceTypes,
  onSetContainersComputeTypes,
  onSetContainersArchitectures,
  onSetContainersBillingGranularity,
  onSetAnalyticsEngines,
  onSetAnalyticsDeploymentTypes,
  onSetAiServiceTypes,
  onSetAiModelTiers,
  onSetAiModalities,
  onSetAiContextWindows,
  onSetAiMultimodalOptions,
  onSetNetworkingServices,
  onSetNetworkingConnectionTypes,
  onSetNetworkingRoutingTypes,
  onSetNetworkingHaSupport,
  onSetNetworkingVpcSupport,
  onSetNetworkingDirections,
  onSetNetworkingBillingModels,
  onSetNetworkingUsageTiers,
  onSetNetworkingPortCapacities,
  onSetNetworkingTransferScopes,
  onSetStorageCategories,
  onSetStorageTiers,
  onSetStorageRedundancies,
  onSetStorageMedia,
  onSetAppHostingTiers,
  onSetAppHostingComputeTypes,
  onSetServerlessServiceTypes,
  onSetIntegrationServices,
  onSetIntegrationPricingModels,
  onSetIntegrationTiers,
  onSetIntegrationSizes,
  onSetIntegrationProtocols,
  onVCpuRangeChange,
  onMemoryRangeChange,
  onServerlessTimeoutRangeChange,
  onPriceRangeChange,
  onOutputPriceRangeChange,
  onGpuCountRangeChange,
  onShowAggregationChange,
  onToggleSection,
  isOpen = false,
  onClose,
}: FilterSidebarProps) {
  const config = useDynamicFilters();
  // Only the providers applicable to the active category (e.g. no OpenAI on VMs).
  // Alphabetical by display name, not by declaration order in the config.
  // The config lists providers roughly by market position, which put Alibaba
  // last and made the list feel arbitrary to scan — a filter list is looked up
  // by name, so name order is what helps. Sorted on `name` rather than `id`
  // because the label is what the user reads ("Alibaba Cloud", not "alibaba"),
  // and localeCompare so accented or mixed-case names order predictably.
  const applicableProviders = [...staticConfig.providersForType(activeProductType)]
    .sort(staticConfig.compareProvidersForDisplay);
  const activeNonSoon = applicableProviders.filter(p => !p.soon).map(p => p.id);
  // Group provider chips by type so hyperscalers (AWS, Azure, GCP...) and
  // specialized providers (OpenAI, Anthropic, vector DBs...) render as
  // visually distinct groups rather than an undifferentiated flat list.
  // Grouping is preserved; the sort applies within each group.
  const providerGroups = [
    { label: 'Cloud Platforms', services: applicableProviders.filter(p => !p.soon && p.providerType === 'hyperscaler').map(p => p.id) },
    { label: 'Specialized Providers', services: applicableProviders.filter(p => !p.soon && p.providerType === 'specialized').map(p => p.id) },
  ].filter(g => g.services.length > 0);
  
  const currentVCpuDefault = 
    activeProductType === 'serverless' ? config.DEFAULT_SERVERLESS_VCPU_RANGE : 
    activeProductType === 'containers' ? config.DEFAULT_CONTAINERS_VCPU_RANGE : 
    config.DEFAULT_VCPU_RANGE;
  const currentMemoryDefault =
    activeProductType === 'serverless' ? config.DEFAULT_SERVERLESS_MEMORY_RANGE :
    activeProductType === 'containers' ? config.DEFAULT_CONTAINERS_MEMORY_RANGE :
    config.DEFAULT_MEMORY_RANGE;

  // Scroll the filter panel back to the top whenever the active category
  // changes, so switching categories from the left nav doesn't leave you
  // scrolled deep into the previous category's filter options.
  const scrollRef = useRef<HTMLElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeProductType]);

  return (
    <>
    {/* Mobile backdrop */}
    {isOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    )}
    <aside
      ref={scrollRef}
      className={`
        w-72 border-r border-[#dde0f0] dark:border-[#1e1e38] flex flex-col overflow-y-auto bg-[#f7f8ff] dark:bg-[#06060f] custom-scrollbar pb-10
        fixed inset-y-0 left-0 z-50 max-w-[85vw] transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shrink-0 lg:transition-none
      `}
    >
      {/* Mobile-only header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#dde0f0] dark:border-[#1e1e38] lg:hidden sticky top-0 bg-[#f7f8ff] dark:bg-[#06060f] z-10">
        <span className="text-sm font-bold text-[#1e1e38] dark:text-[#e5e7eb]">Filters</span>
        <button
          onClick={onClose}
          className="text-2xl leading-none px-2 text-[#737373] hover:text-[#1e1e38] dark:hover:text-[#f7f8ff]"
          aria-label="Close filters"
        >
          ×
        </button>
      </div>
      <div className="p-4 space-y-8">
        {/* Category intro — explains what this product category page compares */}
        <p className="text-[11px] leading-relaxed text-[#737373] dark:text-[#a3a3a3]">
          {`${PRODUCT_TYPE_DESCRIPTIONS[activeProductType]} Leaving a section unchecked means it isn't filtered.`}
        </p>

        {/* Providers Section — grouped into Cloud Platforms (hyperscalers) vs
            Specialized Providers (AI model vendors, vector DBs, edge/security)
            so users don't read e.g. OpenAI as a peer of AWS. */}
        <GroupedFilterSection
          title="Provider"
          tooltip="Cloud platforms and specialized providers offering pricing in this category. Click a provider tile or chip to filter."
          // The only preserveOrder on the site. providerGroups is built from
          // compareProvidersForDisplay, which already sorts alphabetically WITHIN
          // each group and deliberately puts Hyperscalers before Specialized.
          // Re-sorting here would alphabetize the group labels and flip that.
          preserveOrder
          groups={providerGroups}
          allOptions={activeNonSoon}
          getLabel={(id) => config.PROVIDERS.find(p => p.id === id)?.name || id}
          selected={selectedProviders}
          counts={facetCounts.provider}
          onToggle={onProviderToggle}
          onSetAll={onSetProviders}
          isExpanded={expanded.provider ?? true}
          onToggleExpand={() => onToggleSection('provider')}
        />

        {/* Product-specific sections */}
        {activeProductType === 'vm' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region where the VM runs."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />

            <FilterSection
              title="Category"
              tooltip="Instance type purpose, derived from each cloud's published instance families."
              options={config.CATEGORIES}
              selected={selectedCategory}
              counts={facetCounts.category}
              onToggle={onCategoryToggle}
              onSetAll={onSetCategory}
              isExpanded={expanded.category ?? true}
              onToggleExpand={() => onToggleSection('category')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />

            <FilterSection
              title="Operating System"
              tooltip="The operating system running on the VM."
              options={config.OS_TYPES}
              selected={selectedOS}
              counts={facetCounts.os}
              onToggle={onOsToggle}
              onSetAll={onSetOS}
              isExpanded={expanded.os ?? true}
              onToggleExpand={() => onToggleSection('os')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />

            <FilterSection
              title="CPU"
              tooltip="Processor vendor and architecture. ARM covers both AWS Graviton and Ampere Altra — the table shows the specific chip."
              options={config.CPU_PROFILES.map(p => p.id)}
              getLabel={(id) => config.CPU_PROFILES.find(p => p.id === id)?.label || id}
              selected={selectedCpu}
              counts={facetCounts.cpuVendor}
              // Profile ids ('arm') aren't DB cpu_vendor values ('AWS', 'Ampere') —
              // map them so the count sums correctly instead of resolving to zero.
              countValues={Object.fromEntries(config.CPU_PROFILES.map(p => [p.id, p.vendors]))}
              onToggle={onCpuToggle}
              onSetAll={onSetCpu}
              isExpanded={expanded.cpu ?? true}
              onToggleExpand={() => onToggleSection('cpu')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />

          </>
        )}

        {activeProductType === 'gpu' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region where the instance runs."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />

            <FilterSection
              title="Operating System"
              tooltip="The operating system running on the instance."
              options={config.OS_TYPES}
              selected={selectedOS}
              counts={facetCounts.os}
              onToggle={onOsToggle}
              onSetAll={onSetOS}
              isExpanded={expanded.os ?? true}
              onToggleExpand={() => onToggleSection('os')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />

            <FilterSection
              title="GPU Vendor"
              tooltip="The chip vendor — NVIDIA, AMD, Google (TPU), AWS (Trainium/Inferentia), or Intel (Gaudi). Derived from the GPU model classification, same source as GPU Model below."
              options={config.GPU_VENDORS}
              selected={selectedGpuVendors}
              counts={facetCounts.gpuVendor}
              onToggle={onGpuVendorToggle}
              onSetAll={onSetGpuVendor}
              isExpanded={expanded.gpuVendor ?? true}
              onToggleExpand={() => onToggleSection('gpuVendor')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />

            <GroupedFilterSection
              title="GPU Model"
              tooltip="The accelerator chip itself — H100, A100, L4, MI300X, etc. Derived from each provider's instance-type naming, not a field the pricing APIs expose directly."
              groups={(() => {
                const groups: { label: string; services: string[] }[] = [];
                config.GPU_MODELS.forEach(m => {
                  const spec = GPU_MODEL_SPECS[m];
                  const vram = spec ? spec.vramGb : 0;
                  let bucket = 'Other';
                  if (vram >= 80) bucket = 'Training & Large Models';
                  else if (vram >= 32) bucket = 'Mid-Range';
                  else if (vram >= 16) bucket = 'Inference & Standard';
                  else if (vram > 0) bucket = 'Entry Level';
                  
                  let group = groups.find(g => g.label === bucket);
                  if (!group) {
                    group = { label: bucket, services: [] };
                    groups.push(group);
                  }
                  group.services.push(m);
                });
                
                const order = ['Training & Large Models', 'Mid-Range', 'Inference & Standard', 'Entry Level', 'Other'];
                groups.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
                return groups;
              })()}
              allOptions={config.GPU_MODELS}
              selected={selectedGpuModels}
              counts={facetCounts.gpuModel}
              onToggle={onGpuModelToggle}
              onSetAll={onSetGpuModel}
              isExpanded={expanded.gpuModel ?? true}
              onToggleExpand={() => onToggleSection('gpuModel')}
              disabledOptions={
                selectedGpuVendors.length > 0
                  ? config.GPU_MODELS.filter(m => {
                      const spec = GPU_MODEL_SPECS[m];
                      return spec && !selectedGpuVendors.includes(spec.vendor);
                    })
                  : []
              }
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
          </>
        )}

        {activeProductType === 'database' && (() => {
          const isOnlyVector = selectedDbFamilies.length === 1 && selectedDbFamilies[0].toLowerCase() === 'vector';
          const validEngines = selectedDbFamilies.length > 0 
            ? selectedDbFamilies.flatMap(f => {
                const mappedFamily = Object.keys(staticConfig.DB_FAMILY_MAPPINGS || {}).find(
                  k => k.toLowerCase() === f.toLowerCase()
                );
                return mappedFamily ? staticConfig.DB_FAMILY_MAPPINGS[mappedFamily] : [];
              })
            : staticConfig.DB_ENGINES;
            
          const disabledEngines = staticConfig.DB_ENGINES.filter(e => !validEngines.includes(e));

          return (
            <>
              <FilterSection
                title="Geography"
                tooltip="Geographic region where the database is deployed."
                options={config.GEOGRAPHIES}
                selected={selectedGeographies}
                counts={facetCounts.geography}
                onToggle={onGeographyToggle}
                onSetAll={onSetGeographies}
                isExpanded={expanded.geography ?? true}
                onToggleExpand={() => onToggleSection('geography')}
              />
              <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
              <FilterSection
                title="Database Family"
                tooltip="The broad category of the database system: Relational (SQL-based) or NoSQL."
                options={config.DB_FAMILIES}
                selected={selectedDbFamilies}
                onToggle={onDbFamilyToggle}
                onSetAll={onSetDbFamilies}
                isExpanded={expanded.dbFamily ?? true}
                onToggleExpand={() => onToggleSection('dbFamily')}
              />
              <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
              <GroupedFilterSection
                title="Database Engine"
                tooltip="The database engine: PostgreSQL, MySQL, SQL Server, Oracle DB, etc."
                groups={groupEngines(staticConfig.DB_ENGINES)}
                allOptions={staticConfig.DB_ENGINES}
                selected={selectedEngines}
                counts={facetCounts.engines}
                onToggle={onEngineToggle}
                onSetAll={onSetEngines}
                isExpanded={expanded.engine ?? true}
                onToggleExpand={() => onToggleSection('engine')}
                disabledOptions={disabledEngines}
              />
              {!isOnlyVector && (
                <>
                  <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
                  <FilterSection
                    title="Deployment"
                    tooltip="Provisioned: fixed instance size billed hourly. Serverless: auto-scales, billed per compute unit consumed."
                    options={config.DEPLOYMENT_TYPES}
                    selected={selectedDeploymentTypes}
                    onToggle={onDeploymentTypeToggle}
                    onSetAll={onSetDeploymentTypes}
                    isExpanded={expanded.deploymentType ?? true}
                    onToggleExpand={() => onToggleSection('deploymentType')}
                  />
                  <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
                  <FilterSection
                    title="HIGH-AVAILABILITY"
                    tooltip="High-availability configuration: Single AZ (no redundancy), Multi AZ (same-region standby), Zone Redundant, or Multi Region (geo-redundant)."
                    options={config.HA_MODES}
                    selected={selectedHaModes}
                    counts={facetCounts.haModes}
                    onToggle={onHaModeToggle}
                    onSetAll={onSetHaModes}
                    isExpanded={expanded.haMode ?? true}
                    onToggleExpand={() => onToggleSection('haMode')}
                  />
                </>
              )}
              <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            </>
          );
        })()}

        {/* AI filters */}
        {activeProductType === 'ai' && (
          <>
            <FilterSection
              title="Service Type"
              tooltip="Type of AI Service."
              options={config.AI_SERVICE_TYPES}
              selected={selectedAiServiceTypes}
              onToggle={onAiServiceTypeToggle}
              onSetAll={onSetAiServiceTypes}
              isExpanded={expanded.aiServiceTypes ?? true}
              onToggleExpand={() => onToggleSection('aiServiceTypes')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Model Tier"
              tooltip="Performance and size tier of the model."
              options={config.AI_MODEL_TIERS}
              // preserveOrder is safe now: modelTier is reserved for the genuine
              // capability ladder (Frontier/Standard/Efficient) since the
              // 2026-07-28 split that moved modality values (Chat, Coding,
              // Image, Reasoning, Embedding...) onto their own `modality` field
              // and "Modality" filter below. Nothing else writes into this list
              // anymore, so Frontier→Standard→Efficient can render in that
              // meaningful order instead of alphabetically.
              preserveOrder
              selected={selectedAiModelTiers}
              onToggle={onAiModelTierToggle}
              onSetAll={onSetAiModelTiers}
              isExpanded={expanded.aiModelTiers ?? true}
              onToggleExpand={() => onToggleSection('aiModelTiers')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Modality"
              tooltip="What kind of model this is — Chat, Coding, Embedding, Image, etc."
              options={config.AI_MODALITIES}
              selected={selectedAiModalities}
              onToggle={onAiModalityToggle}
              onSetAll={onSetAiModalities}
              isExpanded={expanded.aiModalities ?? true}
              onToggleExpand={() => onToggleSection('aiModalities')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Context Window"
              tooltip="Maximum token context window supported."
              options={config.AI_CONTEXT_WINDOWS}
              selected={selectedAiContextWindows}
              onToggle={onAiContextWindowToggle}
              onSetAll={onSetAiContextWindows}
              isExpanded={expanded.aiContextWindows ?? true}
              onToggleExpand={() => onToggleSection('aiContextWindows')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Multimodal"
              tooltip="Does the model support multimodal inputs (e.g. Image/Audio)?"
              options={config.AI_MULTIMODAL_OPTIONS}
              selected={selectedAiMultimodalOptions}
              onToggle={onAiMultimodalOptionToggle}
              onSetAll={onSetAiMultimodalOptions}
              isExpanded={expanded.aiMultimodalOptions ?? true}
              onToggleExpand={() => onToggleSection('aiMultimodalOptions')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
          </>
        )}

        {/* Serverless filters */}
        {activeProductType === 'serverless' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region where the service is deployed."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Service Type"
              tooltip="Compute (Lambda/Functions/Run) or Container (e.g. Azure Container Apps)."
              options={config.SERVERLESS_SERVICE_TYPES}
              selected={selectedServerlessServiceTypes}
              onToggle={onServerlessServiceTypeToggle}
              onSetAll={onSetServerlessServiceTypes}
              isExpanded={expanded.serverlessServiceType ?? true}
              onToggleExpand={() => onToggleSection('serverlessServiceType')}
            />
            <FilterSection
              title="Architecture"
              tooltip="CPU architecture: x86 (Intel/AMD) or ARM (e.g. AWS Graviton). ARM is typically cheaper."
              options={config.SERVERLESS_ARCHITECTURES}
              selected={selectedServerlessArchitectures}
              onToggle={onServerlessArchitectureToggle}
              onSetAll={onSetServerlessArchitectures}
              isExpanded={expanded.serverlessArchitecture ?? true}
              onToggleExpand={() => onToggleSection('serverlessArchitecture')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Languages"
              tooltip="Supported programming languages."
              options={config.SERVERLESS_LANGUAGES}
              selected={selectedServerlessLanguages}
              onToggle={onServerlessLanguageToggle}
              onSetAll={onSetServerlessLanguages}
              isExpanded={expanded.languages ?? true}
              onToggleExpand={() => onToggleSection('languages')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Cold Start"
              tooltip="Typical cold start overhead."
              options={config.SERVERLESS_COLD_START_OPTIONS}
              selected={selectedServerlessColdStart}
              onToggle={onServerlessColdStartToggle}
              onSetAll={onSetServerlessColdStart}
              isExpanded={expanded.coldStart ?? true}
              onToggleExpand={() => onToggleSection('coldStart')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Memory Config"
              tooltip="How memory is allocated."
              options={config.SERVERLESS_MEMORY_CONFIG_OPTIONS}
              selected={selectedServerlessMemoryConfig}
              onToggle={onServerlessMemoryConfigToggle}
              onSetAll={onSetServerlessMemoryConfig}
              isExpanded={expanded.memoryConfig ?? true}
              onToggleExpand={() => onToggleSection('memoryConfig')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Execution Model"
              tooltip="How the code runs (ZIP vs Container)."
              options={config.SERVERLESS_EXECUTION_MODEL_OPTIONS}
              selected={selectedServerlessExecutionModel}
              onToggle={onServerlessExecutionModelToggle}
              onSetAll={onSetServerlessExecutionModel}
              isExpanded={expanded.executionModel ?? true}
              onToggleExpand={() => onToggleSection('executionModel')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Provisioned Concurrency"
              tooltip="Pre-warm instances to avoid cold starts."
              options={config.SERVERLESS_PROVISIONED_CONCURRENCY_OPTIONS}
              selected={selectedServerlessProvisionedConcurrency}
              onToggle={onServerlessProvisionedConcurrencyToggle}
              onSetAll={onSetServerlessProvisionedConcurrency}
              isExpanded={expanded.provisionedConcurrency ?? true}
              onToggleExpand={() => onToggleSection('provisionedConcurrency')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Ephemeral Storage"
              tooltip="Local storage available during execution (GB)."
              options={config.SERVERLESS_EPHEMERAL_STORAGE_OPTIONS}
              selected={selectedServerlessEphemeralStorage}
              onToggle={onServerlessEphemeralStorageToggle}
              onSetAll={onSetServerlessEphemeralStorage}
              isExpanded={expanded.ephemeralStorage ?? true}
              onToggleExpand={() => onToggleSection('ephemeralStorage')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Free Tier"
              tooltip="Is there a monthly free invocation allowance?"
              options={config.SERVERLESS_FREE_TIER_OPTIONS}
              selected={selectedServerlessFreeTier}
              onToggle={onServerlessFreeTierToggle}
              onSetAll={onSetServerlessFreeTier}
              isExpanded={expanded.freeTier ?? true}
              onToggleExpand={() => onToggleSection('freeTier')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Granularity (ms)"
              tooltip="Billing duration granularity."
              options={config.SERVERLESS_GRANULARITY_OPTIONS}
              selected={selectedServerlessGranularity}
              onToggle={onServerlessGranularityToggle}
              onSetAll={onSetServerlessGranularity}
              isExpanded={expanded.granularity ?? true}
              onToggleExpand={() => onToggleSection('granularity')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
          </>
        )}

        {/* Containers filters */}
        {activeProductType === 'containers' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Service Type"
              tooltip="Orchestration (Kubernetes, serverless platforms) vs. Container Registry (image storage and management)."
              options={['Orchestration', 'Container Registry']}
              selected={selectedContainersServiceTypes || ['Orchestration', 'Container Registry']}
              onToggle={(st) => onContainersServiceTypeToggle?.(st)}
              onSetAll={(st) => onSetContainersServiceTypes?.(st)}
              isExpanded={expanded.containersServiceType ?? true}
              onToggleExpand={() => onToggleSection('containersServiceType')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Orchestrator"
              tooltip="Underlying orchestration platform."
              options={config.CONTAINERS_ORCHESTRATORS}
              selected={selectedContainersOrchestrators}
              onToggle={onContainersOrchestratorToggle}
              onSetAll={onSetContainersOrchestrators}
              isExpanded={expanded.containersOrchestrator ?? true}
              onToggleExpand={() => onToggleSection('containersOrchestrator')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Compute Type"
              tooltip="How compute resources are provisioned."
              options={config.CONTAINERS_COMPUTE_TYPES}
              selected={selectedContainersComputeTypes}
              onToggle={onContainersComputeTypeToggle}
              onSetAll={onSetContainersComputeTypes}
              isExpanded={expanded.containersComputeType ?? true}
              onToggleExpand={() => onToggleSection('containersComputeType')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Architecture"
              tooltip="CPU architecture."
              options={config.CONTAINERS_ARCHITECTURES}
              selected={selectedContainersArchitectures}
              onToggle={onContainersArchitectureToggle}
              onSetAll={onSetContainersArchitectures}
              isExpanded={expanded.containersArchitecture ?? true}
              onToggleExpand={() => onToggleSection('containersArchitecture')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Billing Granularity"
              tooltip="How billing is calculated."
              options={[...config.CONTAINERS_BILLING_GRANULARITY].sort((a, b) => {
                // Order by unit of time, smallest → largest, rather than alphabetically.
                const order = ['100ms', 'Second', 'Hour'];
                const ia = order.indexOf(a); const ib = order.indexOf(b);
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
              })}
              getLabel={(opt) => opt === '100ms' ? 'Millisecond' : opt}
              selected={selectedContainersBillingGranularity}
              onToggle={onContainersBillingGranularityToggle}
              onSetAll={onSetContainersBillingGranularity}
              isExpanded={expanded.containersBillingGranularity ?? true}
              onToggleExpand={() => onToggleSection('containersBillingGranularity')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Registry Pricing Component"
              tooltip="What you're being charged for: storage (per GB/month), data transfer (per GB), or API operations."
              options={config.REGISTRY_PRICING_COMPONENTS}
              selected={selectedRegistryPricingComponent || []}
              onToggle={(pc) => onRegistryPricingComponentToggle?.(pc)}
              onSetAll={(pc) => onSetRegistryPricingComponent?.(pc)}
              isExpanded={expanded.registryPricingComponent ?? true}
              onToggleExpand={() => onToggleSection('registryPricingComponent')}
            />
          </>
        )}

        {/* Networking filters */}
        {activeProductType === 'networking' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <GroupedFilterSection
              title="Service"
              tooltip="Networking service type, grouped by function."
              groups={config.NETWORKING_SERVICE_GROUPS}
              allOptions={config.NETWORKING_SERVICES}
              selected={selectedNetworkingServices}
              onToggle={onNetworkingServiceToggle}
              onSetAll={onSetNetworkingServices}
              isExpanded={expanded.networkingService ?? true}
              onToggleExpand={() => onToggleSection('networkingService')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Connection Type"
              tooltip="Point-to-point or Multipoint."
              options={config.NETWORKING_CONNECTION_TYPES}
              selected={selectedNetworkingConnectionTypes}
              onToggle={onNetworkingConnectionTypeToggle}
              onSetAll={onSetNetworkingConnectionTypes}
              isExpanded={expanded.networkingConnectionType ?? true}
              onToggleExpand={() => onToggleSection('networkingConnectionType')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Routing Type"
              tooltip="Dynamic or Fixed routing."
              options={config.NETWORKING_ROUTING_TYPES}
              selected={selectedNetworkingRoutingTypes}
              onToggle={onNetworkingRoutingTypeToggle}
              onSetAll={onSetNetworkingRoutingTypes}
              isExpanded={expanded.networkingRoutingType ?? true}
              onToggleExpand={() => onToggleSection('networkingRoutingType')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Billing Model"
              tooltip="How you are charged (Uptime vs. Data)."
              options={config.NETWORKING_BILLING_MODELS}
              selected={selectedNetworkingBillingModels}
              onToggle={onNetworkingBillingModelToggle}
              onSetAll={onSetNetworkingBillingModels}
              isExpanded={expanded.networkingBillingModel ?? true}
              onToggleExpand={() => onToggleSection('networkingBillingModel')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Usage Tier"
              tooltip="Pricing tier or allowance level."
              options={config.NETWORKING_USAGE_TIERS}
              selected={selectedNetworkingUsageTiers}
              onToggle={onNetworkingUsageTierToggle}
              onSetAll={onSetNetworkingUsageTiers}
              isExpanded={expanded.networkingUsageTier ?? true}
              onToggleExpand={() => onToggleSection('networkingUsageTier')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Port Capacity"
              tooltip="Throughput capacity for dedicated connections."
              options={config.NETWORKING_PORT_CAPACITIES}
              selected={selectedNetworkingPortCapacities}
              onToggle={onNetworkingPortCapacityToggle}
              onSetAll={onSetNetworkingPortCapacities}
              isExpanded={expanded.networkingPortCapacity ?? true}
              onToggleExpand={() => onToggleSection('networkingPortCapacity')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Transfer Scope"
              tooltip="Geographic scope of the data transfer."
              options={config.NETWORKING_TRANSFER_SCOPES}
              selected={selectedNetworkingTransferScopes}
              onToggle={onNetworkingTransferScopeToggle}
              onSetAll={onSetNetworkingTransferScopes}
              isExpanded={expanded.networkingTransferScope ?? true}
              onToggleExpand={() => onToggleSection('networkingTransferScope')}
            />
            <FilterSection
              title="HA Support"
              tooltip="High Availability Support."
              options={config.NETWORKING_HA_SUPPORT}
              selected={selectedNetworkingHaSupport}
              onToggle={onNetworkingHaSupportToggle}
              onSetAll={onSetNetworkingHaSupport}
              isExpanded={expanded.networkingHaSupport ?? true}
              onToggleExpand={() => onToggleSection('networkingHaSupport')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="VPC Support"
              tooltip="VPC Integration Support."
              options={config.NETWORKING_VPC_SUPPORT}
              selected={selectedNetworkingVpcSupport}
              onToggle={onNetworkingVpcSupportToggle}
              onSetAll={onSetNetworkingVpcSupport}
              isExpanded={expanded.networkingVpcSupport ?? true}
              onToggleExpand={() => onToggleSection('networkingVpcSupport')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Direction"
              tooltip="Data transfer direction."
              options={config.NETWORKING_DIRECTIONS}
              selected={selectedNetworkingDirections}
              onToggle={onNetworkingDirectionToggle}
              onSetAll={onSetNetworkingDirections}
              isExpanded={expanded.networkingTransferDirection ?? true}
              onToggleExpand={() => onToggleSection('networkingTransferDirection')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
          </>
        )}
        {/* Security filters */}
        {activeProductType === 'security' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region for the service."
              options={config.GEOGRAPHIES_SECURITY.length > 0 ? config.GEOGRAPHIES_SECURITY : ['N. America', 'Asia Pacific']}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            {config.SECURITY_SERVICE_GROUPS.map((group, index) => {
              const groupSelected = selectedSecurityServices.filter(s => group.services.includes(s));
              const handleSetGroup = (services: string[]) => {
                const otherSelected = selectedSecurityServices.filter(s => !group.services.includes(s));
                onSetSecurityServices([...otherSelected, ...services]);
              };
              
              return (
                <React.Fragment key={group.label}>
                  <FilterSection
                    title={group.label}
                    tooltip={`${group.label} services.`}
                    options={group.services}
                    // Drop the (IAM)/(KMS) acronym from the button label only —
                    // the underlying value stays full so table results keep it.
                    getLabel={(id) => id.replace(/\s*\((IAM|KMS)\)$/, '')}
                    selected={groupSelected}
                    onToggle={onSecurityServiceToggle}
                    onSetAll={handleSetGroup}
                    isExpanded={expanded[`security_${group.label}`] ?? true}
                    onToggleExpand={() => onToggleSection(`security_${group.label}`)}
                  />
                  <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Storage filters */}
        {activeProductType === 'storage' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region where the storage is hosted."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Storage Type"
              tooltip="Object/Blob (S3-like), Block (disks), File (shared), or Archive (cold)."
              options={config.STORAGE_CATEGORIES}
              selected={selectedStorageCategories}
              onToggle={onStorageCategoryToggle}
              onSetAll={onSetStorageCategories}
              isExpanded={expanded.storageCategory ?? true}
              onToggleExpand={() => onToggleSection('storageCategory')}
              getLabel={(val) => val === 'Object' ? 'Object (Blob)' : val}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Tier"
              tooltip="Access tier: Standard (hot), Infrequent (cool), or Cold (archive)."
              options={config.STORAGE_TIERS}
              selected={selectedStorageTiers}
              onToggle={onStorageTierToggle}
              onSetAll={onSetStorageTiers}
              isExpanded={expanded.storageTier ?? true}
              onToggleExpand={() => onToggleSection('storageTier')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Redundancy"
              tooltip="Replication scope: Single-Zone, Zone-Redundant, or Geo-Redundant."
              options={config.STORAGE_REDUNDANCIES}
              selected={selectedStorageRedundancies}
              onToggle={onStorageRedundancyToggle}
              onSetAll={onSetStorageRedundancies}
              isExpanded={expanded.storageRedundancy ?? true}
              onToggleExpand={() => onToggleSection('storageRedundancy')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Media"
              tooltip="Underlying media (SSD or HDD). Applies to block and some file storage."
              options={config.STORAGE_MEDIA}
              selected={selectedStorageMedia}
              onToggle={onStorageMediaToggle}
              onSetAll={onSetStorageMedia}
              isExpanded={expanded.storageMedia ?? true}
              onToggleExpand={() => onToggleSection('storageMedia')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
          </>
        )}

        {/* App Hosting Specific Filters */}
        {activeProductType === 'app-hosting' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region where the app hosting service is deployed."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Tiers"
              tooltip="Pricing and capability tier of the hosting service"
              options={config.APP_HOSTING_TIERS}
              selected={selectedAppHostingTiers}
              onToggle={onAppHostingTierToggle}
              onSetAll={onSetAppHostingTiers}
              isExpanded={expanded.appHostingTiers ?? true}
              onToggleExpand={() => onToggleSection('appHostingTiers')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Compute Type"
              tooltip="Whether the underlying compute resources are shared or dedicated"
              options={config.APP_HOSTING_COMPUTE_TYPES}
              selected={selectedAppHostingComputeTypes}
              onToggle={onAppHostingComputeTypeToggle}
              onSetAll={onSetAppHostingComputeTypes}
              isExpanded={expanded.appHostingComputeTypes ?? true}
              onToggleExpand={() => onToggleSection('appHostingComputeTypes')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
          </>
        )}

        {/* Integration Specific Filters */}
        {activeProductType === 'integration' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region where the integration service is deployed."
              options={config.GEOGRAPHIES}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Service Type"
              tooltip="The category of integration/messaging service."
              options={staticConfig.INTEGRATION_SERVICES}
              selected={selectedIntegrationServices}
              onToggle={onIntegrationServiceToggle}
              onSetAll={onSetIntegrationServices}
              isExpanded={expanded.integrationServices ?? true}
              onToggleExpand={() => onToggleSection('integrationServices')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Pricing Model"
              tooltip="How the service is billed: usage-based (per operation), data-based (per GB/TB), or a flat monthly fee."
              options={staticConfig.INTEGRATION_PRICING_MODELS}
              getLabel={(id) => staticConfig.INTEGRATION_PRICING_MODEL_LABELS[id] ?? id}
              selected={selectedIntegrationPricingModels}
              onToggle={onIntegrationPricingModelToggle}
              onSetAll={onSetIntegrationPricingModels}
              isExpanded={expanded.integrationPricingModels ?? true}
              onToggleExpand={() => onToggleSection('integrationPricingModels')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Tier"
              tooltip="The deployment/pricing tier."
              options={staticConfig.INTEGRATION_TIERS}
              selected={selectedIntegrationTiers}
              onToggle={onIntegrationTierToggle}
              onSetAll={onSetIntegrationTiers}
              isExpanded={expanded.integrationTiers ?? true}
              onToggleExpand={() => onToggleSection('integrationTiers')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            
            {(selectedIntegrationServices.length === 0 || 
              selectedIntegrationServices.includes('Messaging') || 
              selectedIntegrationServices.includes('Eventing') || 
              selectedIntegrationServices.length === staticConfig.INTEGRATION_SERVICES.length) && (
              <>
                <FilterSection
                  title="Max Message Size"
                  tooltip="Filter by maximum supported message/payload size."
                  options={staticConfig.INTEGRATION_SIZES}
                  selected={selectedIntegrationSizes}
                  onToggle={onIntegrationSizeToggle}
                  onSetAll={onSetIntegrationSizes}
                  isExpanded={expanded.integrationSizes ?? true}
                  onToggleExpand={() => onToggleSection('integrationSizes')}
                />
                <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
              </>
            )}

            {(selectedIntegrationServices.length === 0 || 
              selectedIntegrationServices.includes('API Gateway') || 
              selectedIntegrationServices.length === staticConfig.INTEGRATION_SERVICES.length) && (
              <>
                <FilterSection
                  title="Protocols"
                  tooltip="Filter by supported API protocols."
                  options={staticConfig.INTEGRATION_PROTOCOLS}
                  selected={selectedIntegrationProtocols}
                  onToggle={onIntegrationProtocolToggle}
                  onSetAll={onSetIntegrationProtocols}
                  isExpanded={expanded.integrationProtocols ?? true}
                  onToggleExpand={() => onToggleSection('integrationProtocols')}
                />
                <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
              </>
            )}
          </>
        )}

        {/* Data Analytics filters */}
        {activeProductType === 'data-analytics' && (
          <>
            <FilterSection
              title="Geography"
              tooltip="Geographic region. Analytics services are offered from a representative region per provider, normalized to the geography shown."
              options={config.GEOGRAPHIES_ANALYTICS.length > 0 ? config.GEOGRAPHIES_ANALYTICS : ['N. America', 'Asia Pacific']}
              selected={selectedGeographies}
              counts={facetCounts.geography}
              onToggle={onGeographyToggle}
              onSetAll={onSetGeographies}
              isExpanded={expanded.geography ?? true}
              onToggleExpand={() => onToggleSection('geography')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <GroupedFilterSection
              title="Engine"
              tooltip="Analytics Engine, grouped by type: Cloud Data Warehouses, Provisioned Platforms, Open-Source solutions, and Streaming services."
              groups={groupAnalyticsEngines(config.ANALYTICS_ENGINES)}
              allOptions={config.ANALYTICS_ENGINES}
              selected={selectedAnalyticsEngines}
              onToggle={onAnalyticsEngineToggle}
              onSetAll={onSetAnalyticsEngines}
              isExpanded={expanded.engine ?? true}
              onToggleExpand={() => onToggleSection('engine')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            <FilterSection
              title="Deployment"
              tooltip="Provisioned or Serverless."
              options={config.ANALYTICS_DEPLOYMENT_TYPES}
              selected={selectedAnalyticsDeploymentTypes}
              onToggle={onAnalyticsDeploymentTypeToggle}
              onSetAll={onSetAnalyticsDeploymentTypes}
              isExpanded={expanded.deploymentType ?? true}
              onToggleExpand={() => onToggleSection('deploymentType')}
            />
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
            {(() => {
              const tierModel = buildAnalyticsTierModel(config.ANALYTICS_TIERS);
              return (
                <GroupedFilterSection
                  title="Tier"
                  tooltip="Performance / capacity tier. Edition buttons are grouped across vendors (e.g. Enterprise covers Enterprise, Enterprise Edition and Enterprise Plus); the table always shows each product's exact tier."
                  groups={tierModel.groups}
                  allOptions={config.ANALYTICS_TIERS}
                  optionValues={tierModel.optionValues}
                  selected={selectedAnalyticsTiers}
                  onToggle={onAnalyticsTierToggle}
                  onSetAll={onSetAnalyticsTiers}
                  isExpanded={expanded.tier ?? true}
                  onToggleExpand={() => onToggleSection('tier')}
                  getLabel={formatAnalyticsTierLabel}
                />
              );
            })()}
            <div className="h-px bg-[#dde0f0] dark:bg-[#1f1f1f] mx-1" />
          </>
        )}

        {/* Specs & Price Sliders */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="m-0">
              <button
                onClick={() => onToggleSection('specs')}
                className="text-[10px] font-bold text-[#737373] uppercase tracking-widest flex items-center gap-1.5 hover:text-black dark:hover:text-[#f7f8ff] transition-colors"
              >
                <ChevronDown size={10} className={`transition-transform ${expanded.specs ? '' : '-rotate-90'}`} />
                {['vm', 'database', 'containers', 'serverless', 'gpu', 'app-hosting'].includes(activeProductType) ? 'Specs & Price' : 'Price'} <Tooltip text={activeProductType === 'ai' ? "Filter by input price ($/1M tokens). Prices are on-demand USD." : ['vm', 'database', 'containers', 'app-hosting'].includes(activeProductType) ? "Filter by vCPU count, memory size (GB), and price ($). Toggle PAYG or Yearly. Prices are on-demand USD." : activeProductType === 'gpu' ? "Filter by memory size (GB), GPU count, and price ($). Toggle PAYG or Yearly. Prices are on-demand USD." : activeProductType === 'serverless' ? "Filter by vCPU count, memory size (GB), timeout (sec), and price ($). Toggle PAYG or Yearly. Prices are on-demand USD." : "Filter by price ($). Toggle PAYG or Yearly. Prices are on-demand USD."}><Info size={10} className="cursor-help" /></Tooltip>
              </button>
            </h2>
            <button
              onClick={() => {
                onVCpuRangeChange({ ...currentVCpuDefault });
                onMemoryRangeChange({ ...currentMemoryDefault });
                onPriceRangeChange({ ...config.DEFAULT_PRICE_RANGE });
                if (activeProductType === 'gpu') {
                  onGpuCountRangeChange({ ...config.DEFAULT_GPU_COUNT_RANGE });
                }
                if (activeProductType === 'serverless') {
                  onServerlessTimeoutRangeChange({ ...config.DEFAULT_SERVERLESS_TIMEOUT_RANGE });
                }
              }}
              className={`text-[10px] font-bold uppercase transition-colors ${
                vCpuRange.min !== currentVCpuDefault.min ||
                vCpuRange.max !== currentVCpuDefault.max ||
                memoryRange.min !== currentMemoryDefault.min ||
                memoryRange.max !== currentMemoryDefault.max ||
                priceRange.min !== config.DEFAULT_PRICE_RANGE.min ||
                priceRange.max !== config.DEFAULT_PRICE_RANGE.max ||
                (activeProductType === 'gpu' && (gpuCountRange.min !== config.DEFAULT_GPU_COUNT_RANGE.min || gpuCountRange.max !== config.DEFAULT_GPU_COUNT_RANGE.max)) ||
                (activeProductType === 'serverless' && (serverlessTimeoutRange.min !== config.DEFAULT_SERVERLESS_TIMEOUT_RANGE.min || serverlessTimeoutRange.max !== config.DEFAULT_SERVERLESS_TIMEOUT_RANGE.max))
                  ? 'text-black dark:text-[#f7f8ff]'
                  : 'text-[#737373] hover:text-black dark:hover:text-[#f7f8ff]'
              }`}
            >
              Clear All
            </button>
          </div>
          {expanded.specs && (
            <div className="space-y-8 px-1">
              {['vm', 'database', 'containers', 'app-hosting', 'serverless'].includes(activeProductType) && (
                <>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#737373]">vCPU</div>
                    <RangeSlider
                      min={currentVCpuDefault.min}
                      max={currentVCpuDefault.max}
                      value={vCpuRange}
                      onChange={onVCpuRangeChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#737373]">Memory (GB)</div>
                    <RangeSlider
                      min={currentMemoryDefault.min}
                      max={currentMemoryDefault.max}
                      value={memoryRange}
                      onChange={onMemoryRangeChange}
                    />
                  </div>
                </>
              )}
              {activeProductType === 'gpu' && (
                <>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#737373]">Memory (GB)</div>
                    <RangeSlider
                      min={currentMemoryDefault.min}
                      max={currentMemoryDefault.max}
                      value={memoryRange}
                      onChange={onMemoryRangeChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#737373]">GPU Count</div>
                    <RangeSlider
                      min={config.DEFAULT_GPU_COUNT_RANGE.min}
                      max={config.DEFAULT_GPU_COUNT_RANGE.max}
                      value={gpuCountRange}
                      onChange={onGpuCountRangeChange}
                    />
                  </div>
                </>
              )}
              {activeProductType === 'serverless' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#737373]">Timeout (sec)</div>
                  <RangeSlider
                    min={config.DEFAULT_SERVERLESS_TIMEOUT_RANGE.min}
                    max={config.DEFAULT_SERVERLESS_TIMEOUT_RANGE.max}
                    value={serverlessTimeoutRange}
                    onChange={onServerlessTimeoutRangeChange}
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#737373]">
                  {activeProductType === 'ai' ? 'Input Price ($/1M Tokens)' : 'Price ($)'}
                </div>
                <RangeSlider
                  min={config.DEFAULT_PRICE_RANGE.min}
                  max={config.DEFAULT_PRICE_RANGE.max}
                  step={0.1}
                  unit="$"
                  value={priceRange}
                  onChange={onPriceRangeChange}
                />
              </div>
              {activeProductType === 'ai' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#737373]">Output Price ($/1M Tokens)</div>
                  <RangeSlider
                    min={config.DEFAULT_PRICE_RANGE.min}
                    max={config.DEFAULT_PRICE_RANGE.max}
                    step={0.1}
                    unit="$"
                    value={outputPriceRange}
                    onChange={onOutputPriceRangeChange}
                  />
                </div>
              )}
              {activeProductType !== 'ai' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#737373]">PAYG or Yearly</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onShowAggregationChange(false)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all border ${
                        !showAggregation
                          ? 'bg-black dark:bg-[#f7f8ff] text-[#f7f8ff] dark:text-black border-black dark:border-[#f7f8ff]'
                          : 'bg-[#dde0f0] dark:bg-[#1e1e38] text-[#737373] border-[#dde0f0] dark:border-[#1e1e38] hover:border-[#a3a3a3] dark:hover:border-[#404040]'
                      }`}
                    >
                      PAYG
                    </button>
                    <button
                      onClick={() => onShowAggregationChange(true)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all border ${
                        showAggregation
                          ? 'bg-black dark:bg-[#f7f8ff] text-[#f7f8ff] dark:text-black border-black dark:border-[#f7f8ff]'
                          : 'bg-[#dde0f0] dark:bg-[#1e1e38] text-[#737373] border-[#dde0f0] dark:border-[#1e1e38] hover:border-[#a3a3a3] dark:hover:border-[#404040]'
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

      </div>
    </aside>
    </>
  );
}
