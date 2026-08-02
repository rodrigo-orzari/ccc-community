/**
 * Azure Containers Pricing Configuration (Static Fallback)
 *
 * Comprehensive list of Azure Container Instances (ACI) and Azure Kubernetes Service (AKS) node pools.
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

// Helper for ACI pricing calculation (hourly)
// x86 Linux: vCPU=$0.046/hr, Memory=$0.005/hr/GB
const calculateAciPrice = (vcpus: number, memoryGb: number) => {
  return (vcpus * 0.046) + (memoryGb * 0.005);
};

const baseAzureContainerEntries = [
  // Managed Kubernetes Control Plane
  { type: 'AKS Control Plane (Standard)', vcpus: 0, memory: 0, cpuVendor: 'Intel', price: 0.10, orchestrator: 'Kubernetes', compute_type: 'Managed Kubernetes', architecture: 'x86', billing_granularity: 'Hour' },

  // ACI (Serverless) - x86
  { type: 'ACI-0.5vCPU-1GB-x86', vcpus: 0.5, memory: 1, cpuVendor: 'Intel', price: calculateAciPrice(0.5, 1), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'ACI-1vCPU-2GB-x86', vcpus: 1, memory: 2, cpuVendor: 'Intel', price: calculateAciPrice(1, 2), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'ACI-2vCPU-4GB-x86', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: calculateAciPrice(2, 4), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'ACI-4vCPU-8GB-x86', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: calculateAciPrice(4, 8), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'ACI-8vCPU-16GB-x86', vcpus: 8, memory: 16, cpuVendor: 'Intel', price: calculateAciPrice(8, 16), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },

  // AKS Nodes (General Purpose - x86)
  { type: 'AKS-Standard_D2s_v5', vcpus: 2, memory: 8, cpuVendor: 'Intel', price: 0.096, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AKS-Standard_D4s_v5', vcpus: 4, memory: 16, cpuVendor: 'Intel', price: 0.192, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AKS-Standard_D8s_v5', vcpus: 8, memory: 32, cpuVendor: 'Intel', price: 0.384, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },

  // AKS Nodes (General Purpose - ARM)
  { type: 'AKS-Standard_D2ps_v5', vcpus: 2, memory: 8, cpuVendor: 'Ampere', price: 0.076, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'AKS-Standard_D4ps_v5', vcpus: 4, memory: 16, cpuVendor: 'Ampere', price: 0.152, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'AKS-Standard_D8ps_v5', vcpus: 8, memory: 32, cpuVendor: 'Ampere', price: 0.304, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },

  // AKS Nodes (Compute Optimized - x86)
  { type: 'AKS-Standard_F2s_v2', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: 0.085, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AKS-Standard_F4s_v2', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: 0.169, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },

  // AKS Nodes (Memory Optimized - x86)
  { type: 'AKS-Standard_E2s_v5', vcpus: 2, memory: 16, cpuVendor: 'Intel', price: 0.126, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'AKS-Standard_E4s_v5', vcpus: 4, memory: 32, cpuVendor: 'Intel', price: 0.252, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
];

export const AZURE_CONTAINERS = baseAzureContainerEntries.map(addContainerAttributes);

export const AZURE_CONTAINERS_REGION = 'eastus';
export const AZURE_CONTAINERS_GEOGRAPHY = 'N. America';
