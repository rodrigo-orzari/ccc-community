/**
 * DigitalOcean App Platform Functions Pricing Configuration
 *
 * Pricing as of May 2026 (Consumption Plan)
 * - Compute: Included with DigitalOcean App Platform
 * - Invocations: Free tier includes 200M invocations/month
 * - After free tier: $0.0000015 per invocation
 * - Per-second execution: Included in the App Platform compute
 *
 * Cold Start: ~100-150ms (fast startup on shared infrastructure)
 * Timeout: 600 seconds (10 minutes)
 * Memory: Automatic allocation (not user-configurable)
 * Free Tier: 200M invocations/month
 *
 * DigitalOcean Functions run on shared infrastructure
 * Memory allocation is automatic (not user-configurable)
 * Supported runtimes: Node.js, Python, Go
 *
 * Supported Languages: JavaScript (Node.js), Python, Go, TypeScript
 */

const DIGITALOCEAN_FUNCTIONS_LANGUAGES = ['JavaScript', 'Python', 'Go', 'TypeScript'];

// Helper function to add serverless-specific attributes to DigitalOcean entries
const addDigitaloceanServerlessAttributes = (entry: any) => ({
  ...entry,
  attributes: {
    service_type: 'Compute',
    deployment_type: 'Serverless',
    tier: 'Serverless',
    cold_start_overhead_ms: 125,
    timeout_seconds: 600,
    memory_configuration: 'automatic',
    invocation_price: 0.0000015,
    free_invocations_per_month: 200000000,
    max_memory_gb: 0.512,
    billing_granularity_ms: 100,
    invocation_price_per_1m: 1.50,
    execution_model: 'Both',
    provisioned_concurrency_support: 'No',
    max_ephemeral_storage_gb: 0.512,
  }
});

const baseDigitaloceanEntries = [
  // DigitalOcean Functions - Single Tier (Auto-scaled)
  {
    type: 'AppPlatform-Functions-Shared',
    vcpus: 1,
    memory: 0.512, // Approximate shared compute
    cpuVendor: 'Intel',
    price: 0, // Included in App Platform subscription or free tier
    supportedLanguages: DIGITALOCEAN_FUNCTIONS_LANGUAGES,
  },
];

export const DIGITALOCEAN_SERVERLESS = baseDigitaloceanEntries.map(addDigitaloceanServerlessAttributes);

export const DIGITALOCEAN_SERVERLESS_REGION = 'nyc';
export const DIGITALOCEAN_SERVERLESS_GEOGRAPHY = 'N. America';
