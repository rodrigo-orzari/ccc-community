/**
 * AWS Containers Pricing Configuration (Static Fallback)
 *
 * Comprehensive list of Fargate and EKS offerings.
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

// Helper for Fargate pricing calculation (hourly)
// x86: vCPU=$0.04048/hr, Memory=$0.004445/hr/GB
// ARM: vCPU=$0.03238/hr, Memory=$0.00356/hr/GB
const calculateFargatePrice = (vcpus: number, memoryGb: number, arch: 'x86' | 'ARM') => {
  if (arch === 'x86') return (vcpus * 0.04048) + (memoryGb * 0.004445);
  return (vcpus * 0.03238) + (memoryGb * 0.00356);
};

const baseAwsContainerEntries = [
  // Managed Kubernetes Control Plane
  { type: 'EKS Control Plane', vcpus: 0, memory: 0, cpuVendor: 'AWS', price: 0.10, orchestrator: 'Kubernetes', compute_type: 'Managed Kubernetes', architecture: 'x86', billing_granularity: 'Hour' },

  // Fargate (Serverless) - x86
  { type: 'Fargate-0.5vCPU-1GB-x86', vcpus: 0.5, memory: 1, cpuVendor: 'Intel', price: calculateFargatePrice(0.5, 1, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'Fargate-1vCPU-2GB-x86', vcpus: 1, memory: 2, cpuVendor: 'Intel', price: calculateFargatePrice(1, 2, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'Fargate-2vCPU-4GB-x86', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: calculateFargatePrice(2, 4, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'Fargate-4vCPU-8GB-x86', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: calculateFargatePrice(4, 8, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'Fargate-8vCPU-16GB-x86', vcpus: 8, memory: 16, cpuVendor: 'Intel', price: calculateFargatePrice(8, 16, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'Fargate-16vCPU-32GB-x86', vcpus: 16, memory: 32, cpuVendor: 'Intel', price: calculateFargatePrice(16, 32, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },

  // Fargate (Serverless) - ARM
  { type: 'Fargate-0.5vCPU-1GB-ARM', vcpus: 0.5, memory: 1, cpuVendor: 'AWS', price: calculateFargatePrice(0.5, 1, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Fargate-1vCPU-2GB-ARM', vcpus: 1, memory: 2, cpuVendor: 'AWS', price: calculateFargatePrice(1, 2, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Fargate-2vCPU-4GB-ARM', vcpus: 2, memory: 4, cpuVendor: 'AWS', price: calculateFargatePrice(2, 4, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Fargate-4vCPU-8GB-ARM', vcpus: 4, memory: 8, cpuVendor: 'AWS', price: calculateFargatePrice(4, 8, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Fargate-8vCPU-16GB-ARM', vcpus: 8, memory: 16, cpuVendor: 'AWS', price: calculateFargatePrice(8, 16, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Fargate-16vCPU-32GB-ARM', vcpus: 16, memory: 32, cpuVendor: 'AWS', price: calculateFargatePrice(16, 32, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },

  // EKS Nodes (General Purpose - x86)
  { type: 'EKS-m6i.large', vcpus: 2, memory: 8, cpuVendor: 'Intel', price: 0.096, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'EKS-m6i.xlarge', vcpus: 4, memory: 16, cpuVendor: 'Intel', price: 0.192, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'EKS-m6i.2xlarge', vcpus: 8, memory: 32, cpuVendor: 'Intel', price: 0.384, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },

  // EKS Nodes (General Purpose - ARM)
  { type: 'EKS-m6g.large', vcpus: 2, memory: 8, cpuVendor: 'AWS', price: 0.077, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'EKS-m6g.xlarge', vcpus: 4, memory: 16, cpuVendor: 'AWS', price: 0.154, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'EKS-m6g.2xlarge', vcpus: 8, memory: 32, cpuVendor: 'AWS', price: 0.308, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },

  // EKS Nodes (Compute Optimized - x86)
  { type: 'EKS-c6i.large', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: 0.085, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'EKS-c6i.xlarge', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: 0.17, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },

  // EKS Nodes (Compute Optimized - ARM)
  { type: 'EKS-c6g.large', vcpus: 2, memory: 4, cpuVendor: 'AWS', price: 0.068, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'EKS-c6g.xlarge', vcpus: 4, memory: 8, cpuVendor: 'AWS', price: 0.136, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },

  // EKS Nodes (Memory Optimized - x86)
  { type: 'EKS-r6i.large', vcpus: 2, memory: 16, cpuVendor: 'Intel', price: 0.126, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'EKS-r6i.xlarge', vcpus: 4, memory: 32, cpuVendor: 'Intel', price: 0.252, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },

  // EKS Nodes (Memory Optimized - ARM)
  { type: 'EKS-r6g.large', vcpus: 2, memory: 16, cpuVendor: 'AWS', price: 0.1008, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'EKS-r6g.xlarge', vcpus: 4, memory: 32, cpuVendor: 'AWS', price: 0.2016, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
];

export const AWS_CONTAINERS = baseAwsContainerEntries.map(addContainerAttributes);

export const AWS_CONTAINERS_REGION = 'us-east-1';
export const AWS_CONTAINERS_GEOGRAPHY = 'N. America';
