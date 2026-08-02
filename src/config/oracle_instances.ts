// Oracle Cloud Infrastructure (OCI) Compute instance pricing.
//
// OCI does not currently expose a free, public, no-auth pricing API, so this
// catalogue is maintained manually. Source: https://www.oracle.com/cloud/compute/pricing/
// To update prices: edit the entries below; the next pipeline run will refresh
// the database. Keep `cpuVendor` and `gpuCount` accurate.
//
// Pricing model (Flex shapes): Oracle bills per-OCPU + per-GB-RAM at these
// public rates (on-demand, USD), as of the last update of this file:
//   VM.Standard.E4.Flex: $0.025/OCPU/hr + $0.0015/GB/hr (AMD EPYC Rome)
//   VM.Standard.E5.Flex: $0.027/OCPU/hr + $0.0017/GB/hr (AMD EPYC Genoa)
//   VM.Standard3.Flex:   $0.04/OCPU/hr  + $0.0025/GB/hr (Intel Ice Lake)
//   VM.Standard.A1.Flex: $0.01/OCPU/hr  + $0.0015/GB/hr (Ampere Altra ARM)
//   VM.Standard.A2.Flex: $0.014/OCPU/hr + $0.0017/GB/hr (Ampere AmpereOne ARM)
//   VM.Optimized3.Flex:  $0.0646/OCPU/hr + $0.001025/GB/hr (Intel high-freq)
// Note: Oracle's OCPU = 2 vCPU on x86 (hyperthreaded); 1 vCPU on Ampere ARM.
// We store vCPU here (post-conversion) for parity with other providers.

export interface OracleInstanceConfig {
  type: string;
  vcpus: number;
  memory: number;
  price: number;
  cpuVendor: 'Intel' | 'AMD' | 'Ampere' | 'AWS';
  gpuCount?: number;
}

export const ORACLE_REGION = 'us-phoenix-1';
export const ORACLE_GEOGRAPHY = 'N. America';

export const ORACLE_INSTANCES: OracleInstanceConfig[] = [
  // VM.Standard.E4.Flex (AMD EPYC Rome)
  { type: 'VM.Standard.E4.Flex (1 OCPU, 16 GB)',   vcpus: 2,  memory: 16,  price: 0.049,  cpuVendor: 'AMD' },
  { type: 'VM.Standard.E4.Flex (4 OCPU, 64 GB)',   vcpus: 8,  memory: 64,  price: 0.196,  cpuVendor: 'AMD' },
  { type: 'VM.Standard.E4.Flex (16 OCPU, 256 GB)', vcpus: 32, memory: 256, price: 0.784,  cpuVendor: 'AMD' },

  // VM.Standard.E5.Flex (AMD EPYC Genoa)
  { type: 'VM.Standard.E5.Flex (4 OCPU, 64 GB)',   vcpus: 8,  memory: 64,  price: 0.2168, cpuVendor: 'AMD' },
  { type: 'VM.Standard.E5.Flex (16 OCPU, 256 GB)', vcpus: 32, memory: 256, price: 0.8672, cpuVendor: 'AMD' },

  // VM.Standard3.Flex (Intel Ice Lake)
  { type: 'VM.Standard3.Flex (2 OCPU, 32 GB)',  vcpus: 4,  memory: 32,  price: 0.16, cpuVendor: 'Intel' },
  { type: 'VM.Standard3.Flex (8 OCPU, 128 GB)', vcpus: 16, memory: 128, price: 0.64, cpuVendor: 'Intel' },

  // VM.Standard.A1.Flex (Ampere Altra ARM)
  { type: 'VM.Standard.A1.Flex (1 OCPU, 6 GB)',    vcpus: 1,  memory: 6,   price: 0.019, cpuVendor: 'Ampere' },
  { type: 'VM.Standard.A1.Flex (16 OCPU, 96 GB)',  vcpus: 16, memory: 96,  price: 0.304, cpuVendor: 'Ampere' },
  { type: 'VM.Standard.A1.Flex (80 OCPU, 480 GB)', vcpus: 80, memory: 480, price: 1.520, cpuVendor: 'Ampere' },

  // VM.Standard.A2.Flex (AmpereOne ARM)
  { type: 'VM.Standard.A2.Flex (4 OCPU, 32 GB)',  vcpus: 4,  memory: 32,  price: 0.1104, cpuVendor: 'Ampere' },

  // VM.Optimized3.Flex (Intel high-freq)
  { type: 'VM.Optimized3.Flex (2 OCPU, 8 GB)',   vcpus: 4,  memory: 8,  price: 0.137, cpuVendor: 'Intel' },
  { type: 'VM.Optimized3.Flex (8 OCPU, 32 GB)',  vcpus: 16, memory: 32, price: 0.550, cpuVendor: 'Intel' },

  // Bare metal
  { type: 'BM.Standard.E4.128', vcpus: 256, memory: 2048, price: 6.144, cpuVendor: 'AMD' },
  { type: 'BM.Standard3.64',    vcpus: 128, memory: 1024, price: 5.120, cpuVendor: 'Intel' },
  { type: 'BM.Standard.A1.160', vcpus: 160, memory: 1024, price: 3.200, cpuVendor: 'Ampere' },

  // HPC bare metal
  { type: 'BM.HPC.E5.144', vcpus: 288, memory: 1536, price: 8.064, cpuVendor: 'AMD' },

  // GPU shapes
  { type: 'VM.GPU.A10.1',     vcpus: 15,  memory: 240,  price: 2.00,  cpuVendor: 'AMD',   gpuCount: 1 },
  { type: 'VM.GPU.A10.2',     vcpus: 30,  memory: 480,  price: 4.00,  cpuVendor: 'AMD',   gpuCount: 2 },
  { type: 'BM.GPU.A10.4',     vcpus: 64,  memory: 1024, price: 8.00,  cpuVendor: 'AMD',   gpuCount: 4 },
  { type: 'BM.GPU.L40S.4',    vcpus: 112, memory: 1024, price: 14.40, cpuVendor: 'Intel', gpuCount: 4 },
  { type: 'BM.GPU.A100-v2.8', vcpus: 128, memory: 2048, price: 32.00, cpuVendor: 'AMD',   gpuCount: 8 },
  { type: 'BM.GPU.H100.8',    vcpus: 224, memory: 2048, price: 80.00, cpuVendor: 'Intel', gpuCount: 8 },
  { type: 'BM.GPU.H200.8',    vcpus: 224, memory: 3072, price: 88.00, cpuVendor: 'Intel', gpuCount: 8 },
];
