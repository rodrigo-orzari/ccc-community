/**
 * Oracle Cloud Functions Pricing Configuration (Fallback)
 *
 * Pricing as of May 2026 (GB-second rates converted to GB-hour)
 * Based on Fn Project architecture.
 * Execution: $0.000014974 per GB-second
 * Invocation: $0.20 per 1M invocations
 *
 * Supported Languages: Java, Python, Node.js, Go, Ruby, C#
 * Cold Start: ~150ms (Medium 100-200)
 * Timeout: 5 minutes (300 seconds) up to 15 minutes max depending on config, default short-medium
 * Memory: User-configurable
 * Free Tier: 2M invocations/month, 400,000 GB-seconds/month
 */

const ORACLE_LAMBDA_LANGUAGES = ['Java', 'Python', 'Node', 'Go', 'Ruby', 'C#'];
const ORACLE_EXECUTION_PRICE_PER_GB_SEC = 0.000014974;
const HOURLY_MULTIPLIER = 3600;

// Helper function to add serverless-specific attributes to entries
const addServerlessAttributes = (entry: any) => ({
  ...entry,
  attributes: {
    service_type: 'Compute',
    deployment_type: 'Serverless',
    tier: 'Serverless',
    cold_start_overhead_ms: 150, // Medium 100-200 range
    timeout_seconds: 300,
    memory_configuration: 'user-configurable',
    invocation_price: 0.0000002, // $0.20 per 1M invocations
    free_invocations_per_month: 2000000,
    max_ephemeral_storage_gb: 0.256, // Updated based on plan
    billing_granularity_ms: 100,
    invocation_price_per_1m: 0.20,
    execution_model: 'Container Image',
    provisioned_concurrency_support: 'Yes',
  }
});

const baseOracleEntries = [
  // 128MB tier
  { type: 'Oracle-Functions-128MB', vcpus: 1, memory: 0.125, cpuVendor: 'AMD', price: ORACLE_EXECUTION_PRICE_PER_GB_SEC * HOURLY_MULTIPLIER * 0.125, supportedLanguages: ORACLE_LAMBDA_LANGUAGES },
  // 256MB tier
  { type: 'Oracle-Functions-256MB', vcpus: 1, memory: 0.256, cpuVendor: 'AMD', price: ORACLE_EXECUTION_PRICE_PER_GB_SEC * HOURLY_MULTIPLIER * 0.256, supportedLanguages: ORACLE_LAMBDA_LANGUAGES },
  // 512MB tier
  { type: 'Oracle-Functions-512MB', vcpus: 1, memory: 0.512, cpuVendor: 'AMD', price: ORACLE_EXECUTION_PRICE_PER_GB_SEC * HOURLY_MULTIPLIER * 0.512, supportedLanguages: ORACLE_LAMBDA_LANGUAGES },
  // 1GB tier
  { type: 'Oracle-Functions-1GB', vcpus: 1, memory: 1, cpuVendor: 'AMD', price: ORACLE_EXECUTION_PRICE_PER_GB_SEC * HOURLY_MULTIPLIER * 1, supportedLanguages: ORACLE_LAMBDA_LANGUAGES },
  // 2GB tier
  { type: 'Oracle-Functions-2GB', vcpus: 1, memory: 2, cpuVendor: 'AMD', price: ORACLE_EXECUTION_PRICE_PER_GB_SEC * HOURLY_MULTIPLIER * 2, supportedLanguages: ORACLE_LAMBDA_LANGUAGES },
];

export const ORACLE_SERVERLESS = baseOracleEntries.map(addServerlessAttributes);

export const ORACLE_SERVERLESS_REGION = 'us-ashburn-1';
export const ORACLE_SERVERLESS_GEOGRAPHY = 'N. America';
