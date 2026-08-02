/**
 * Alibaba Function Compute Pricing Configuration (Fallback)
 *
 * Alibaba bills Function Compute on two dimensions billed separately:
 *   vCPU:   $0.000014 per vCPU-second
 *   Memory: $0.0000015 per GB-second
 *
 * The previous config modeled these as two half-rows ('Function Compute (vCPU)'
 * with memory=0 and '(Memory)' with vcpus=0), which produced zero-value cells,
 * wrong memory-bucket placement, and blank attribute columns. We now model FC the
 * same way the other providers are modeled: a small ladder of memory tiers with a
 * proportional vCPU allocation (~1 vCPU : 2 GB) and a combined per-hour price:
 *   price/hour = (0.000014 * vCPU + 0.0000015 * GB) * 3600
 *
 * Supported Languages: Node.js, Python, Java, Go, PHP, and custom runtimes/containers
 * Cold Start: ~200ms · Timeout: 600s · Memory: user-configurable · 1ms billing
 */

const ALIBABA_FC_VCPU_PER_SECOND = 0.000014;
const ALIBABA_FC_GB_PER_SECOND = 0.0000015;
const ALIBABA_FC_LANGUAGES = ['Node', 'Python', 'Java', 'Go', 'PHP', 'C#', 'Any'];

const fcPrice = (vcpus: number, memory: number) =>
  (ALIBABA_FC_VCPU_PER_SECOND * vcpus + ALIBABA_FC_GB_PER_SECOND * memory) * 3600;

const addServerlessAttributes = (entry: any) => ({
  ...entry,
  unit: 'GB-Hour',
  attributes: {
    service_type: 'Compute',
    deployment_type: 'Serverless',
    tier: 'Serverless',
    cold_start_overhead_ms: 200,
    timeout_seconds: 600,
    memory_configuration: 'user-configurable',
    invocation_price: 0.00000019,
    free_invocations_per_month: 1000000,
    billing_granularity_ms: 1,
    invocation_price_per_1m: 0.19,
    execution_model: 'Both',
    provisioned_concurrency_support: 'Yes',
    max_ephemeral_storage_gb: 10,
    vpc_support: 'Yes',
  },
});

const baseAlibabaEntries = [
  // 512MB tier
  { type: 'FunctionCompute-512MB', vcpus: 0.35, memory: 0.5, cpuVendor: 'Intel', price: fcPrice(0.35, 0.5), supportedLanguages: ALIBABA_FC_LANGUAGES },
  // 1GB tier
  { type: 'FunctionCompute-1GB', vcpus: 0.5, memory: 1, cpuVendor: 'Intel', price: fcPrice(0.5, 1), supportedLanguages: ALIBABA_FC_LANGUAGES },
  // 2GB tier
  { type: 'FunctionCompute-2GB', vcpus: 1, memory: 2, cpuVendor: 'Intel', price: fcPrice(1, 2), supportedLanguages: ALIBABA_FC_LANGUAGES },
  // 4GB tier
  { type: 'FunctionCompute-4GB', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: fcPrice(2, 4), supportedLanguages: ALIBABA_FC_LANGUAGES },
  // 8GB tier
  { type: 'FunctionCompute-8GB', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: fcPrice(4, 8), supportedLanguages: ALIBABA_FC_LANGUAGES },
];

export const ALIBABA_SERVERLESS = baseAlibabaEntries.map(addServerlessAttributes);

export const ALIBABA_SERVERLESS_REGION = 'ap-southeast-1';
export const ALIBABA_SERVERLESS_GEOGRAPHY = 'Asia Pacific';
