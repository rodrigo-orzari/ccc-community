/**
 * GCP Cloud Run Pricing Configuration (Fallback)
 *
 * Pricing as of May 2026 (converted to per GB-hour for consistency)
 * CPU: $0.00002400 per vCPU-second
 * Memory: $0.00000250 per GB-second
 *
 * Cold Start: ~100-200ms (varies by language and container size)
 * Timeout: 60 minutes (3600 seconds)
 * Memory: User-configurable (min 128MB, max 8GB)
 * Free Tier: 180,000 vCPU-seconds + 360,000 GB-seconds per month
 *
 * Common configurations: 1, 2, 4 vCPU with proportional memory
 * Note: GCP pricing is vCPU + Memory combined (not just memory like Lambda)
 *
 * Supported Languages: Python, Node.js, Go, Java, C#, PHP, Ruby, and any language via container
 */

const GCP_CLOUD_RUN_LANGUAGES = ['Python', 'Node', 'Go', 'Java', 'C#', 'PHP', 'Ruby', 'Any'];

// Helper function to add serverless-specific attributes to Cloud Run entries
const addGcpServerlessAttributes = (entry: any) => ({
  ...entry,
  attributes: {
    service_type: 'Compute',
    deployment_type: 'Serverless',
    tier: 'Serverless',
    cold_start_overhead_ms: 150,
    timeout_seconds: 3600,
    memory_configuration: 'user-configurable',
    invocation_price: 0.0000004,
    free_vcpu_seconds_per_month: 180000,
    free_memory_gb_seconds_per_month: 360000,
    max_memory_gb: 8,
    billing_granularity_ms: 100,
    invocation_price_per_1m: 0.40,
    execution_model: 'Container Image',
    provisioned_concurrency_support: 'Yes',
    max_ephemeral_storage_gb: 32,
  }
});

const baseGcpEntries = [
  // 1 vCPU configurations (512MB to 2GB)
  {
    type: 'CloudRun-1vCPU-512MB',
    vcpus: 1,
    memory: 0.512,
    cpuVendor: 'Intel',
    price: (0.00002400 * 1 * 3600) + (0.00000250 * 0.512 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },
  {
    type: 'CloudRun-1vCPU-1GB',
    vcpus: 1,
    memory: 1,
    cpuVendor: 'Intel',
    price: (0.00002400 * 1 * 3600) + (0.00000250 * 1 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },
  {
    type: 'CloudRun-1vCPU-2GB',
    vcpus: 1,
    memory: 2,
    cpuVendor: 'Intel',
    price: (0.00002400 * 1 * 3600) + (0.00000250 * 2 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },

  // 2 vCPU configurations (1GB to 4GB)
  {
    type: 'CloudRun-2vCPU-1GB',
    vcpus: 2,
    memory: 1,
    cpuVendor: 'Intel',
    price: (0.00002400 * 2 * 3600) + (0.00000250 * 1 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },
  {
    type: 'CloudRun-2vCPU-2GB',
    vcpus: 2,
    memory: 2,
    cpuVendor: 'Intel',
    price: (0.00002400 * 2 * 3600) + (0.00000250 * 2 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },
  {
    type: 'CloudRun-2vCPU-4GB',
    vcpus: 2,
    memory: 4,
    cpuVendor: 'Intel',
    price: (0.00002400 * 2 * 3600) + (0.00000250 * 4 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },

  // 4 vCPU configurations (2GB to 8GB)
  {
    type: 'CloudRun-4vCPU-2GB',
    vcpus: 4,
    memory: 2,
    cpuVendor: 'Intel',
    price: (0.00002400 * 4 * 3600) + (0.00000250 * 2 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },
  {
    type: 'CloudRun-4vCPU-4GB',
    vcpus: 4,
    memory: 4,
    cpuVendor: 'Intel',
    price: (0.00002400 * 4 * 3600) + (0.00000250 * 4 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },
  {
    type: 'CloudRun-4vCPU-8GB',
    vcpus: 4,
    memory: 8,
    cpuVendor: 'Intel',
    price: (0.00002400 * 4 * 3600) + (0.00000250 * 8 * 3600),
    supportedLanguages: GCP_CLOUD_RUN_LANGUAGES,
  },
];

export const GCP_SERVERLESS = baseGcpEntries.map(addGcpServerlessAttributes);

export const GCP_SERVERLESS_REGION = 'us-central1';
export const GCP_SERVERLESS_GEOGRAPHY = 'N. America';
