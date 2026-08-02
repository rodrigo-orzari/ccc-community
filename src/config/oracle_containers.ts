/**
 * Oracle Containers Pricing Configuration (Static Fallback)
 *
 * Comprehensive list of OCI Container Instances and Oracle Kubernetes Engine (OKE) offerings.
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

// OCI uses OCPUs (1 OCPU = 2 vCPU). Prices are typically displayed per OCPU and per GB.
// ARM: $0.015 per OCPU-hr + $0.0015 per GB-hr
// AMD: $0.025 per OCPU-hr + $0.0015 per GB-hr
const calculateOciPrice = (vcpus: number, memoryGb: number, arch: 'x86' | 'ARM') => {
  const ocpus = vcpus / 2; // Oracle bills per OCPU
  if (arch === 'ARM') return (ocpus * 0.015) + (memoryGb * 0.0015);
  return (ocpus * 0.025) + (memoryGb * 0.0015);
};

const baseOracleContainerEntries = [
  // Container Instances (Serverless) - x86
  { type: 'Container-Instance-E4-1vCPU-2GB', vcpus: 1, memory: 2, cpuVendor: 'AMD', price: calculateOciPrice(1, 2, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'Container-Instance-E4-2vCPU-4GB', vcpus: 2, memory: 4, cpuVendor: 'AMD', price: calculateOciPrice(2, 4, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'Container-Instance-E4-4vCPU-8GB', vcpus: 4, memory: 8, cpuVendor: 'AMD', price: calculateOciPrice(4, 8, 'x86'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'x86', billing_granularity: 'Second' },

  // Container Instances (Serverless) - ARM
  { type: 'Container-Instance-A1-1vCPU-2GB', vcpus: 1, memory: 2, cpuVendor: 'Ampere', price: calculateOciPrice(1, 2, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Container-Instance-A1-2vCPU-4GB', vcpus: 2, memory: 4, cpuVendor: 'Ampere', price: calculateOciPrice(2, 4, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Container-Instance-A1-4vCPU-8GB', vcpus: 4, memory: 8, cpuVendor: 'Ampere', price: calculateOciPrice(4, 8, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'Container-Instance-A1-8vCPU-16GB', vcpus: 8, memory: 16, cpuVendor: 'Ampere', price: calculateOciPrice(8, 16, 'ARM'), orchestrator: 'Serverless', compute_type: 'Serverless', architecture: 'ARM', billing_granularity: 'Second' },

  // OKE Nodes (Flex Shapes - ARM)
  { type: 'OKE-VM.Standard.A1.Flex-2vCPU-8GB', vcpus: 2, memory: 8, cpuVendor: 'Ampere', price: calculateOciPrice(2, 8, 'ARM'), orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'OKE-VM.Standard.A1.Flex-4vCPU-16GB', vcpus: 4, memory: 16, cpuVendor: 'Ampere', price: calculateOciPrice(4, 16, 'ARM'), orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },
  { type: 'OKE-VM.Standard.A1.Flex-8vCPU-32GB', vcpus: 8, memory: 32, cpuVendor: 'Ampere', price: calculateOciPrice(8, 32, 'ARM'), orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'ARM', billing_granularity: 'Second' },

  // OKE Nodes (Flex Shapes - x86)
  { type: 'OKE-VM.Standard.E4.Flex-2vCPU-8GB', vcpus: 2, memory: 8, cpuVendor: 'AMD', price: calculateOciPrice(2, 8, 'x86'), orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'OKE-VM.Standard.E4.Flex-4vCPU-16GB', vcpus: 4, memory: 16, cpuVendor: 'AMD', price: calculateOciPrice(4, 16, 'x86'), orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
  { type: 'OKE-VM.Standard.E4.Flex-8vCPU-32GB', vcpus: 8, memory: 32, cpuVendor: 'AMD', price: calculateOciPrice(8, 32, 'x86'), orchestrator: 'Kubernetes', compute_type: 'Provisioned', architecture: 'x86', billing_granularity: 'Second' },
];

export const ORACLE_CONTAINERS = baseOracleContainerEntries.map(addContainerAttributes);

export const ORACLE_CONTAINERS_REGION = 'us-ashburn-1';
export const ORACLE_CONTAINERS_GEOGRAPHY = 'N. America';
