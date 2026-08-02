/**
 * GCP Containers Pricing Configuration (Static Fallback)
 *
 * Comprehensive list of Cloud Run and Google Kubernetes Engine (GKE) offerings.
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

// Helper for Cloud Run pricing calculation (hourly)
// Tier 1 (Iowa): vCPU=$0.0864/hr, Memory=$0.009/hr/GB (Always Allocated / Instance-based)
const calculateCloudRunPrice = (vcpus: number, memoryGb: number) => {
  return (vcpus * 0.0864) + (memoryGb * 0.009);
};

const baseGcpContainerEntries = [
  // Managed Kubernetes Control Plane
  { type: 'GKE Control Plane (Standard)', vcpus: 0, memory: 0, cpuVendor: 'Intel', price: 0.10, orchestrator: 'Kubernetes', compute_type: 'Managed Kubernetes', architecture: 'x86', billing_granularity: 'Hour' },

  // Cloud Run (Serverless) - x86
  { type: 'CloudRun-1vCPU-1GB-x86', vcpus: 1, memory: 1, cpuVendor: 'Intel', price: calculateCloudRunPrice(1, 1), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: '100ms' },
  { type: 'CloudRun-1vCPU-2GB-x86', vcpus: 1, memory: 2, cpuVendor: 'Intel', price: calculateCloudRunPrice(1, 2), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: '100ms' },
  { type: 'CloudRun-2vCPU-4GB-x86', vcpus: 2, memory: 4, cpuVendor: 'Intel', price: calculateCloudRunPrice(2, 4), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: '100ms' },
  { type: 'CloudRun-4vCPU-8GB-x86', vcpus: 4, memory: 8, cpuVendor: 'Intel', price: calculateCloudRunPrice(4, 8), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: '100ms' },
  { type: 'CloudRun-8vCPU-16GB-x86', vcpus: 8, memory: 16, cpuVendor: 'Intel', price: calculateCloudRunPrice(8, 16), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: '100ms' },

  // GKE Nodes (General Purpose - x86)
  { type: 'GKE-e2-standard-2', vcpus: 2, memory: 8, cpuVendor: 'Intel', price: 0.067, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'GKE-e2-standard-4', vcpus: 4, memory: 16, cpuVendor: 'Intel', price: 0.134, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'GKE-e2-standard-8', vcpus: 8, memory: 32, cpuVendor: 'Intel', price: 0.268, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },

  // GKE Nodes (General Purpose - ARM)
  { type: 'GKE-t2a-standard-2', vcpus: 2, memory: 8, cpuVendor: 'Ampere', price: 0.062, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'GKE-t2a-standard-4', vcpus: 4, memory: 16, cpuVendor: 'Ampere', price: 0.124, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'GKE-t2a-standard-8', vcpus: 8, memory: 32, cpuVendor: 'Ampere', price: 0.248, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },

  // GKE Nodes (Compute Optimized - x86)
  { type: 'GKE-c2-standard-4', vcpus: 4, memory: 16, cpuVendor: 'Intel', price: 0.208, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'GKE-c2-standard-8', vcpus: 8, memory: 32, cpuVendor: 'Intel', price: 0.417, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },

  // GKE Nodes (Memory Optimized - x86)
  { type: 'GKE-m2-ultramem-208', vcpus: 208, memory: 5888, cpuVendor: 'Intel', price: 26.65, orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
];

export const GCP_CONTAINERS = baseGcpContainerEntries.map(addContainerAttributes);

export const GCP_CONTAINERS_REGION = 'us-central1';
export const GCP_CONTAINERS_GEOGRAPHY = 'N. America';
