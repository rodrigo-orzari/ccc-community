/**
 * Azure Functions Pricing Configuration (Fallback)
 *
 * Pricing as of May 2026 (Consumption Plan)
 * Execution: $0.000016 per GB-second
 * Free tier: 1M executions + 400K GB-seconds per month
 *
 * Cold Start: ~200-500ms (Consumption plan slower than Premium)
 * Timeout: 5 minutes (300 seconds) on Consumption plan
 * Memory: Fixed allocations from 128MB to 1792MB
 *
 * Memory tiers from 128MB to 1792MB (typical allocations)
 * Premium plans available but not shown here
 *
 * Supported Languages: C#, JavaScript (Node.js), Python, Java, PowerShell, Go, Rust
 */

const AZURE_FUNCTIONS_LANGUAGES = ['C#', 'JavaScript', 'Python', 'Java', 'PowerShell', 'Go', 'Rust'];

// Helper function to add serverless-specific attributes to Azure Functions entries
const addAzureServerlessAttributes = (entry: any) => ({
  ...entry,
  attributes: {
    service_type: 'Compute',
    deployment_type: 'Serverless',
    tier: 'Serverless',
    cold_start_overhead_ms: 350,
    timeout_seconds: 300,
    memory_configuration: 'fixed-tiers',
    invocation_price: 0.0000002,
    free_invocations_per_month: 1000000,
    free_gb_seconds_per_month: 400000,
    max_memory_gb: 1.75,
    billing_granularity_ms: 1,
    invocation_price_per_1m: 0.20,
    execution_model: 'Both',
    provisioned_concurrency_support: 'Yes',
    max_ephemeral_storage_gb: 1.5,
  }
});

const baseAzureEntries = [
  // 128MB tier
  {
    type: 'Functions-128MB-Consumption',
    vcpus: 1,
    memory: 0.128,
    cpuVendor: 'Intel',
    price: 0.000016 * 3600 * 0.128,
    supportedLanguages: AZURE_FUNCTIONS_LANGUAGES,
  },

  // 256MB tier
  {
    type: 'Functions-256MB-Consumption',
    vcpus: 1,
    memory: 0.256,
    cpuVendor: 'Intel',
    price: 0.000016 * 3600 * 0.256,
    supportedLanguages: AZURE_FUNCTIONS_LANGUAGES,
  },

  // 512MB tier
  {
    type: 'Functions-512MB-Consumption',
    vcpus: 1,
    memory: 0.512,
    cpuVendor: 'Intel',
    price: 0.000016 * 3600 * 0.512,
    supportedLanguages: AZURE_FUNCTIONS_LANGUAGES,
  },

  // 1GB tier
  {
    type: 'Functions-1GB-Consumption',
    vcpus: 1,
    memory: 1,
    cpuVendor: 'Intel',
    price: 0.000016 * 3600 * 1,
    supportedLanguages: AZURE_FUNCTIONS_LANGUAGES,
  },

  // 1.5GB tier
  {
    type: 'Functions-1536MB-Consumption',
    vcpus: 1,
    memory: 1.5,
    cpuVendor: 'Intel',
    price: 0.000016 * 3600 * 1.5,
    supportedLanguages: AZURE_FUNCTIONS_LANGUAGES,
  },

  // 1.75GB tier (Azure max for consumption plan)
  {
    type: 'Functions-1792MB-Consumption',
    vcpus: 1,
    memory: 1.75,
    cpuVendor: 'Intel',
    price: 0.000016 * 3600 * 1.75,
    supportedLanguages: AZURE_FUNCTIONS_LANGUAGES,
    serviceOverride: 'Azure Functions'
  },
  
  // Azure Container Apps (Consumption Plan)
  // vCPU: $0.1224 / vCPU-hour, Memory: $0.0144 / GB-hour
  {
    type: 'Container Apps 0.25vCPU/0.5GB',
    vcpus: 0.25,
    memory: 0.5,
    cpuVendor: 'Intel',
    price: (0.1224 * 0.25) + (0.0144 * 0.5),
    supportedLanguages: ['Any (Container)'],
    serviceOverride: 'Container Apps'
  },
  {
    type: 'Container Apps 0.5vCPU/1GB',
    vcpus: 0.5,
    memory: 1,
    cpuVendor: 'Intel',
    price: (0.1224 * 0.5) + (0.0144 * 1),
    supportedLanguages: ['Any (Container)'],
    serviceOverride: 'Container Apps'
  },
  {
    type: 'Container Apps 1vCPU/2GB',
    vcpus: 1,
    memory: 2,
    cpuVendor: 'Intel',
    price: (0.1224 * 1) + (0.0144 * 2),
    supportedLanguages: ['Any (Container)'],
    serviceOverride: 'Container Apps'
  },
  {
    type: 'Container Apps 2vCPU/4GB',
    vcpus: 2,
    memory: 4,
    cpuVendor: 'Intel',
    price: (0.1224 * 2) + (0.0144 * 4),
    supportedLanguages: ['Any (Container)'],
    serviceOverride: 'Container Apps'
  },
];

export const AZURE_SERVERLESS = baseAzureEntries.map(entry => {
  const overrides = addAzureServerlessAttributes(entry);
  if (entry.serviceOverride === 'Container Apps') {
    overrides.attributes.service_type = 'Container';
    overrides.attributes.deployment_type = 'Serverless';
    overrides.attributes.tier = 'Consumption';
  }
  return overrides;
});

export const AZURE_SERVERLESS_REGION = 'eastus';
export const AZURE_SERVERLESS_GEOGRAPHY = 'N. America';
