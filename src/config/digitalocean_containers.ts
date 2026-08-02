/**
 * DigitalOcean Containers Pricing Configuration (Static Fallback)
 *
 * Comprehensive list of App Platform and DigitalOcean Kubernetes (DOKS) offerings.
 */

const addContainerAttributes = (entry: any) => ({
  ...entry,
  attributes: {
    orchestrator: entry.orchestrator,
    compute_type: entry.compute_type,
    architecture: entry.architecture,
    billing_granularity: entry.billing_granularity,
  }
});

// App Platform Professional Tier is based on instances. E.g. 1vCPU/1GB is $24/mo (~$0.0357/hr).
const calculateAppPlatformPrice = (pricePerMonth: number) => {
  return pricePerMonth / 672; // App platform bills based on 672 hours/mo for predictability.
};

const baseDigitaloceanContainerEntries = [
  // App Platform (Serverless) - x86
  { type: 'AppPlatform-Pro-0.5vCPU-1GB', vcpus: 0.5, memory: 1, cpuVendor: 'Intel', price: calculateAppPlatformPrice(12), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AppPlatform-Pro-1vCPU-1GB', vcpus: 1, memory: 1, cpuVendor: 'Intel', price: calculateAppPlatformPrice(24), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AppPlatform-Pro-1vCPU-2GB', vcpus: 1, memory: 2, cpuVendor: 'Intel', price: calculateAppPlatformPrice(30), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AppPlatform-Pro-2vCPU-4GB', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: calculateAppPlatformPrice(60), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AppPlatform-Pro-4vCPU-8GB', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: calculateAppPlatformPrice(120), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },

  // DOKS Nodes (General Purpose - x86)
  { type: 'DOKS-s-2vcpu-4gb', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: 0.03571, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Hour' },
  { type: 'DOKS-s-4vcpu-8gb', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: 0.07143, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Hour' },
  { type: 'DOKS-s-8vcpu-16gb', vcpus: 8, memory: 16, cpuVendor: 'Intel', price: 0.14286, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Hour' },

  // DOKS Nodes (CPU Optimized - x86)
  { type: 'DOKS-c-2', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: 0.0625, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Hour' },
  { type: 'DOKS-c-4', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: 0.125, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Hour' },

  // DOKS Nodes (Memory Optimized - x86)
  { type: 'DOKS-m-2vcpu-16gb', vcpus: 2, memory: 16, cpuVendor: 'Intel', price: 0.0625, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Hour' },
  { type: 'DOKS-m-4vcpu-32gb', vcpus: 4, memory: 32, cpuVendor: 'Intel', price: 0.125, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Hour' },
];

export const DIGITALOCEAN_CONTAINERS = baseDigitaloceanContainerEntries.map(addContainerAttributes);

export const DIGITALOCEAN_CONTAINERS_REGION = 'nyc3';
export const DIGITALOCEAN_CONTAINERS_GEOGRAPHY = 'N. America';
