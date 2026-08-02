// Google Cloud Compute Engine instance pricing.
//
// Prices are on-demand, Linux, us-central1 (lowest-cost US region).
// Source: https://cloud.google.com/compute/vm-instance-pricing
// To update prices: edit entries below; the next pipeline run refreshes the DB.
//
// Pricing formula used for predefined instances:
//   E2:  $0.021811/vCPU/hr + $0.002923/GB/hr
//   N1:  $0.047811/vCPU/hr + $0.006408/GB/hr
//   N2:  $0.031611/vCPU/hr + $0.004237/GB/hr
//   N2D: $0.027502/vCPU/hr + $0.003701/GB/hr
//   T2D: $0.041877/vCPU/hr + $0.005622/GB/hr
//   T2A: $0.038521/vCPU/hr + $0.005130/GB/hr (Ampere Altra ARM)
//   C2:  published fixed prices (Intel Cascade Lake)
//   C2D: $0.035516/vCPU/hr + $0.004767/GB/hr (AMD EPYC Rome)
//   C3:  $0.044080/vCPU/hr + $0.005905/GB/hr (Intel Sapphire Rapids)
//   M1:  published fixed prices (Intel Skylake, memory-optimized)
//   A2:  published fixed prices (Intel + NVIDIA A100)
//   G2:  published fixed prices (Intel + NVIDIA L4)

export interface GcpInstanceConfig {
  type: string;
  vcpus: number;
  memory: number;
  price: number;
  cpuVendor: 'Intel' | 'AMD' | 'Ampere';
  gpuCount?: number;
}

export const GCP_REGION = 'us-central1';
export const GCP_GEOGRAPHY = 'N. America';

export const GCP_INSTANCES: GcpInstanceConfig[] = [
  // ── E2 shared-core (fixed prices) ──────────────────────────────────────────
  { type: 'e2-micro',  vcpus: 2,  memory: 1,  price: 0.0084, cpuVendor: 'Intel' },
  { type: 'e2-small',  vcpus: 2,  memory: 2,  price: 0.0168, cpuVendor: 'Intel' },
  { type: 'e2-medium', vcpus: 2,  memory: 4,  price: 0.0335, cpuVendor: 'Intel' },

  // ── E2 standard ────────────────────────────────────────────────────────────
  { type: 'e2-standard-2',  vcpus: 2,  memory: 8,   price: 0.0670,  cpuVendor: 'Intel' },
  { type: 'e2-standard-4',  vcpus: 4,  memory: 16,  price: 0.1340,  cpuVendor: 'Intel' },
  { type: 'e2-standard-8',  vcpus: 8,  memory: 32,  price: 0.2680,  cpuVendor: 'Intel' },
  { type: 'e2-standard-16', vcpus: 16, memory: 64,  price: 0.5360,  cpuVendor: 'Intel' },
  { type: 'e2-standard-32', vcpus: 32, memory: 128, price: 1.0720,  cpuVendor: 'Intel' },

  // ── E2 highmem (8 GB/vCPU) ────────────────────────────────────────────────
  { type: 'e2-highmem-2',  vcpus: 2,  memory: 16,  price: 0.0904, cpuVendor: 'Intel' },
  { type: 'e2-highmem-4',  vcpus: 4,  memory: 32,  price: 0.1808, cpuVendor: 'Intel' },
  { type: 'e2-highmem-8',  vcpus: 8,  memory: 64,  price: 0.3616, cpuVendor: 'Intel' },
  { type: 'e2-highmem-16', vcpus: 16, memory: 128, price: 0.7232, cpuVendor: 'Intel' },

  // ── E2 highcpu (1 GB/vCPU) ────────────────────────────────────────────────
  { type: 'e2-highcpu-2',  vcpus: 2,  memory: 2,  price: 0.0495, cpuVendor: 'Intel' },
  { type: 'e2-highcpu-4',  vcpus: 4,  memory: 4,  price: 0.0990, cpuVendor: 'Intel' },
  { type: 'e2-highcpu-8',  vcpus: 8,  memory: 8,  price: 0.1980, cpuVendor: 'Intel' },
  { type: 'e2-highcpu-16', vcpus: 16, memory: 16, price: 0.3960, cpuVendor: 'Intel' },
  { type: 'e2-highcpu-32', vcpus: 32, memory: 32, price: 0.7920, cpuVendor: 'Intel' },

  // ── N1 standard (3.75 GB/vCPU) ────────────────────────────────────────────
  { type: 'n1-standard-1',  vcpus: 1,  memory: 3.75,  price: 0.0475, cpuVendor: 'Intel' },
  { type: 'n1-standard-2',  vcpus: 2,  memory: 7.5,   price: 0.0950, cpuVendor: 'Intel' },
  { type: 'n1-standard-4',  vcpus: 4,  memory: 15,    price: 0.1900, cpuVendor: 'Intel' },
  { type: 'n1-standard-8',  vcpus: 8,  memory: 30,    price: 0.3800, cpuVendor: 'Intel' },
  { type: 'n1-standard-16', vcpus: 16, memory: 60,    price: 0.7600, cpuVendor: 'Intel' },
  { type: 'n1-standard-32', vcpus: 32, memory: 120,   price: 1.5200, cpuVendor: 'Intel' },
  { type: 'n1-standard-64', vcpus: 64, memory: 240,   price: 3.0400, cpuVendor: 'Intel' },

  // ── N1 highmem (6.5 GB/vCPU) ─────────────────────────────────────────────
  { type: 'n1-highmem-2',  vcpus: 2,  memory: 13,  price: 0.1313, cpuVendor: 'Intel' },
  { type: 'n1-highmem-4',  vcpus: 4,  memory: 26,  price: 0.2626, cpuVendor: 'Intel' },
  { type: 'n1-highmem-8',  vcpus: 8,  memory: 52,  price: 0.5252, cpuVendor: 'Intel' },
  { type: 'n1-highmem-16', vcpus: 16, memory: 104, price: 1.0504, cpuVendor: 'Intel' },
  { type: 'n1-highmem-32', vcpus: 32, memory: 208, price: 2.1008, cpuVendor: 'Intel' },
  { type: 'n1-highmem-64', vcpus: 64, memory: 416, price: 4.2016, cpuVendor: 'Intel' },

  // ── N1 highcpu (0.9 GB/vCPU) ─────────────────────────────────────────────
  { type: 'n1-highcpu-2',  vcpus: 2,  memory: 1.8,  price: 0.0773, cpuVendor: 'Intel' },
  { type: 'n1-highcpu-4',  vcpus: 4,  memory: 3.6,  price: 0.1546, cpuVendor: 'Intel' },
  { type: 'n1-highcpu-8',  vcpus: 8,  memory: 7.2,  price: 0.3092, cpuVendor: 'Intel' },
  { type: 'n1-highcpu-16', vcpus: 16, memory: 14.4, price: 0.6184, cpuVendor: 'Intel' },
  { type: 'n1-highcpu-32', vcpus: 32, memory: 28.8, price: 1.2368, cpuVendor: 'Intel' },
  { type: 'n1-highcpu-64', vcpus: 64, memory: 57.6, price: 2.4736, cpuVendor: 'Intel' },

  // ── N2 standard (4 GB/vCPU, Intel Cascade Lake) ───────────────────────────
  { type: 'n2-standard-2',  vcpus: 2,  memory: 8,   price: 0.0971, cpuVendor: 'Intel' },
  { type: 'n2-standard-4',  vcpus: 4,  memory: 16,  price: 0.1942, cpuVendor: 'Intel' },
  { type: 'n2-standard-8',  vcpus: 8,  memory: 32,  price: 0.3884, cpuVendor: 'Intel' },
  { type: 'n2-standard-16', vcpus: 16, memory: 64,  price: 0.7768, cpuVendor: 'Intel' },
  { type: 'n2-standard-32', vcpus: 32, memory: 128, price: 1.5536, cpuVendor: 'Intel' },
  { type: 'n2-standard-64', vcpus: 64, memory: 256, price: 3.1072, cpuVendor: 'Intel' },

  // ── N2 highmem (8 GB/vCPU) ────────────────────────────────────────────────
  { type: 'n2-highmem-2',  vcpus: 2,  memory: 16,  price: 0.1306, cpuVendor: 'Intel' },
  { type: 'n2-highmem-4',  vcpus: 4,  memory: 32,  price: 0.2612, cpuVendor: 'Intel' },
  { type: 'n2-highmem-8',  vcpus: 8,  memory: 64,  price: 0.5224, cpuVendor: 'Intel' },
  { type: 'n2-highmem-16', vcpus: 16, memory: 128, price: 1.0448, cpuVendor: 'Intel' },
  { type: 'n2-highmem-32', vcpus: 32, memory: 256, price: 2.0896, cpuVendor: 'Intel' },

  // ── N2 highcpu (1 GB/vCPU) ────────────────────────────────────────────────
  { type: 'n2-highcpu-2',  vcpus: 2,  memory: 2,  price: 0.0717, cpuVendor: 'Intel' },
  { type: 'n2-highcpu-4',  vcpus: 4,  memory: 4,  price: 0.1434, cpuVendor: 'Intel' },
  { type: 'n2-highcpu-8',  vcpus: 8,  memory: 8,  price: 0.2868, cpuVendor: 'Intel' },
  { type: 'n2-highcpu-16', vcpus: 16, memory: 16, price: 0.5736, cpuVendor: 'Intel' },
  { type: 'n2-highcpu-32', vcpus: 32, memory: 32, price: 1.1472, cpuVendor: 'Intel' },
  { type: 'n2-highcpu-64', vcpus: 64, memory: 64, price: 2.2944, cpuVendor: 'Intel' },

  // ── N2D standard (4 GB/vCPU, AMD EPYC) ───────────────────────────────────
  { type: 'n2d-standard-2',  vcpus: 2,  memory: 8,   price: 0.0846, cpuVendor: 'AMD' },
  { type: 'n2d-standard-4',  vcpus: 4,  memory: 16,  price: 0.1692, cpuVendor: 'AMD' },
  { type: 'n2d-standard-8',  vcpus: 8,  memory: 32,  price: 0.3384, cpuVendor: 'AMD' },
  { type: 'n2d-standard-16', vcpus: 16, memory: 64,  price: 0.6768, cpuVendor: 'AMD' },
  { type: 'n2d-standard-32', vcpus: 32, memory: 128, price: 1.3536, cpuVendor: 'AMD' },
  { type: 'n2d-standard-64', vcpus: 64, memory: 256, price: 2.7072, cpuVendor: 'AMD' },

  // ── N2D highmem (8 GB/vCPU) ───────────────────────────────────────────────
  { type: 'n2d-highmem-4',  vcpus: 4,  memory: 32,  price: 0.2285, cpuVendor: 'AMD' },
  { type: 'n2d-highmem-8',  vcpus: 8,  memory: 64,  price: 0.4570, cpuVendor: 'AMD' },
  { type: 'n2d-highmem-16', vcpus: 16, memory: 128, price: 0.9140, cpuVendor: 'AMD' },
  { type: 'n2d-highmem-32', vcpus: 32, memory: 256, price: 1.8280, cpuVendor: 'AMD' },

  // ── N2D highcpu (1 GB/vCPU) ───────────────────────────────────────────────
  { type: 'n2d-highcpu-2',  vcpus: 2,  memory: 2,  price: 0.0625, cpuVendor: 'AMD' },
  { type: 'n2d-highcpu-4',  vcpus: 4,  memory: 4,  price: 0.1250, cpuVendor: 'AMD' },
  { type: 'n2d-highcpu-8',  vcpus: 8,  memory: 8,  price: 0.2500, cpuVendor: 'AMD' },
  { type: 'n2d-highcpu-16', vcpus: 16, memory: 16, price: 0.5000, cpuVendor: 'AMD' },
  { type: 'n2d-highcpu-32', vcpus: 32, memory: 32, price: 1.0000, cpuVendor: 'AMD' },

  // ── T2D standard (4 GB/vCPU, AMD EPYC Milan) ──────────────────────────────
  { type: 't2d-standard-1',  vcpus: 1,  memory: 4,   price: 0.0644, cpuVendor: 'AMD' },
  { type: 't2d-standard-2',  vcpus: 2,  memory: 8,   price: 0.1288, cpuVendor: 'AMD' },
  { type: 't2d-standard-4',  vcpus: 4,  memory: 16,  price: 0.2576, cpuVendor: 'AMD' },
  { type: 't2d-standard-8',  vcpus: 8,  memory: 32,  price: 0.5152, cpuVendor: 'AMD' },
  { type: 't2d-standard-16', vcpus: 16, memory: 64,  price: 1.0304, cpuVendor: 'AMD' },
  { type: 't2d-standard-32', vcpus: 32, memory: 128, price: 2.0608, cpuVendor: 'AMD' },
  { type: 't2d-standard-48', vcpus: 48, memory: 192, price: 3.0912, cpuVendor: 'AMD' },
  { type: 't2d-standard-60', vcpus: 60, memory: 240, price: 3.8640, cpuVendor: 'AMD' },

  // ── T2A standard (4 GB/vCPU, Ampere Altra ARM) ────────────────────────────
  { type: 't2a-standard-1',  vcpus: 1,  memory: 4,   price: 0.0590, cpuVendor: 'Ampere' },
  { type: 't2a-standard-2',  vcpus: 2,  memory: 8,   price: 0.1180, cpuVendor: 'Ampere' },
  { type: 't2a-standard-4',  vcpus: 4,  memory: 16,  price: 0.2360, cpuVendor: 'Ampere' },
  { type: 't2a-standard-8',  vcpus: 8,  memory: 32,  price: 0.4720, cpuVendor: 'Ampere' },
  { type: 't2a-standard-16', vcpus: 16, memory: 64,  price: 0.9440, cpuVendor: 'Ampere' },
  { type: 't2a-standard-32', vcpus: 32, memory: 128, price: 1.8880, cpuVendor: 'Ampere' },
  { type: 't2a-standard-48', vcpus: 48, memory: 192, price: 2.8320, cpuVendor: 'Ampere' },

  // ── C2 standard (4 GB/vCPU, Intel Cascade Lake, compute-optimized) ─────────
  { type: 'c2-standard-4',  vcpus: 4,  memory: 16,  price: 0.2082, cpuVendor: 'Intel' },
  { type: 'c2-standard-8',  vcpus: 8,  memory: 32,  price: 0.4164, cpuVendor: 'Intel' },
  { type: 'c2-standard-16', vcpus: 16, memory: 64,  price: 0.8328, cpuVendor: 'Intel' },
  { type: 'c2-standard-30', vcpus: 30, memory: 120, price: 1.5615, cpuVendor: 'Intel' },
  { type: 'c2-standard-60', vcpus: 60, memory: 240, price: 3.1230, cpuVendor: 'Intel' },

  // ── C2D standard (4 GB/vCPU, AMD EPYC Rome, compute-optimized) ────────────
  { type: 'c2d-standard-2',   vcpus: 2,   memory: 8,   price: 0.0910, cpuVendor: 'AMD' },
  { type: 'c2d-standard-4',   vcpus: 4,   memory: 16,  price: 0.1820, cpuVendor: 'AMD' },
  { type: 'c2d-standard-8',   vcpus: 8,   memory: 32,  price: 0.3640, cpuVendor: 'AMD' },
  { type: 'c2d-standard-16',  vcpus: 16,  memory: 64,  price: 0.7280, cpuVendor: 'AMD' },
  { type: 'c2d-standard-32',  vcpus: 32,  memory: 128, price: 1.4560, cpuVendor: 'AMD' },
  { type: 'c2d-standard-56',  vcpus: 56,  memory: 224, price: 2.5480, cpuVendor: 'AMD' },
  { type: 'c2d-standard-112', vcpus: 112, memory: 448, price: 5.0960, cpuVendor: 'AMD' },

  // ── C2D highmem (8 GB/vCPU) ───────────────────────────────────────────────
  { type: 'c2d-highmem-4',   vcpus: 4,  memory: 32,  price: 0.2950, cpuVendor: 'AMD' },
  { type: 'c2d-highmem-8',   vcpus: 8,  memory: 64,  price: 0.5900, cpuVendor: 'AMD' },
  { type: 'c2d-highmem-16',  vcpus: 16, memory: 128, price: 1.1800, cpuVendor: 'AMD' },
  { type: 'c2d-highmem-32',  vcpus: 32, memory: 256, price: 2.3600, cpuVendor: 'AMD' },
  { type: 'c2d-highmem-56',  vcpus: 56, memory: 448, price: 4.1300, cpuVendor: 'AMD' },

  // ── C2D highcpu (1 GB/vCPU) ───────────────────────────────────────────────
  { type: 'c2d-highcpu-4',   vcpus: 4,  memory: 4,  price: 0.1611, cpuVendor: 'AMD' },
  { type: 'c2d-highcpu-8',   vcpus: 8,  memory: 8,  price: 0.3222, cpuVendor: 'AMD' },
  { type: 'c2d-highcpu-16',  vcpus: 16, memory: 16, price: 0.6444, cpuVendor: 'AMD' },
  { type: 'c2d-highcpu-32',  vcpus: 32, memory: 32, price: 1.2888, cpuVendor: 'AMD' },
  { type: 'c2d-highcpu-56',  vcpus: 56, memory: 56, price: 2.2554, cpuVendor: 'AMD' },

  // ── C3 standard (4 GB/vCPU, Intel Sapphire Rapids, compute-optimized) ──────
  { type: 'c3-standard-4',   vcpus: 4,   memory: 16,  price: 0.2709, cpuVendor: 'Intel' },
  { type: 'c3-standard-8',   vcpus: 8,   memory: 32,  price: 0.5418, cpuVendor: 'Intel' },
  { type: 'c3-standard-22',  vcpus: 22,  memory: 88,  price: 1.4889, cpuVendor: 'Intel' },
  { type: 'c3-standard-44',  vcpus: 44,  memory: 176, price: 2.9778, cpuVendor: 'Intel' },
  { type: 'c3-standard-88',  vcpus: 88,  memory: 352, price: 5.9556, cpuVendor: 'Intel' },

  // ── C3 highmem (8 GB/vCPU) ────────────────────────────────────────────────
  { type: 'c3-highmem-4',   vcpus: 4,  memory: 32,  price: 0.3653, cpuVendor: 'Intel' },
  { type: 'c3-highmem-8',   vcpus: 8,  memory: 64,  price: 0.7306, cpuVendor: 'Intel' },
  { type: 'c3-highmem-22',  vcpus: 22, memory: 176, price: 2.0091, cpuVendor: 'Intel' },
  { type: 'c3-highmem-44',  vcpus: 44, memory: 352, price: 4.0182, cpuVendor: 'Intel' },
  { type: 'c3-highmem-88',  vcpus: 88, memory: 704, price: 8.0364, cpuVendor: 'Intel' },

  // ── M1 (Intel Skylake, memory-optimized) ──────────────────────────────────
  { type: 'm1-megamem-96',    vcpus: 96,  memory: 1433, price: 10.2380, cpuVendor: 'Intel' },
  { type: 'm1-ultramem-40',   vcpus: 40,  memory: 961,  price: 6.3030,  cpuVendor: 'Intel' },
  { type: 'm1-ultramem-80',   vcpus: 80,  memory: 1922, price: 12.6060, cpuVendor: 'Intel' },
  { type: 'm1-ultramem-160',  vcpus: 160, memory: 3844, price: 25.2120, cpuVendor: 'Intel' },

  // ── A2 (NVIDIA A100 40 GB + Intel Cascade Lake) ───────────────────────────
  { type: 'a2-highgpu-1g',   vcpus: 12, memory: 85,   price: 3.6733,  cpuVendor: 'Intel', gpuCount: 1  },
  { type: 'a2-highgpu-2g',   vcpus: 24, memory: 170,  price: 7.3466,  cpuVendor: 'Intel', gpuCount: 2  },
  { type: 'a2-highgpu-4g',   vcpus: 48, memory: 340,  price: 14.6932, cpuVendor: 'Intel', gpuCount: 4  },
  { type: 'a2-highgpu-8g',   vcpus: 96, memory: 680,  price: 29.3864, cpuVendor: 'Intel', gpuCount: 8  },
  { type: 'a2-megagpu-16g',  vcpus: 96, memory: 1360, price: 55.7399, cpuVendor: 'Intel', gpuCount: 16 },

  // ── G2 (NVIDIA L4 + Intel Cascade Lake) ───────────────────────────────────
  { type: 'g2-standard-4',  vcpus: 4,  memory: 16,  price: 1.0025,  cpuVendor: 'Intel', gpuCount: 1 },
  { type: 'g2-standard-8',  vcpus: 8,  memory: 32,  price: 1.1983,  cpuVendor: 'Intel', gpuCount: 1 },
  { type: 'g2-standard-16', vcpus: 16, memory: 64,  price: 1.5899,  cpuVendor: 'Intel', gpuCount: 1 },
  { type: 'g2-standard-24', vcpus: 24, memory: 96,  price: 2.7823,  cpuVendor: 'Intel', gpuCount: 2 },
  { type: 'g2-standard-48', vcpus: 48, memory: 192, price: 5.5646,  cpuVendor: 'Intel', gpuCount: 4 },
  { type: 'g2-standard-96', vcpus: 96, memory: 384, price: 11.1292, cpuVendor: 'Intel', gpuCount: 8 },

  // ── A3 (NVIDIA H100 80GB + Intel Sapphire Rapids) ─────────────────────────
  // Added 2026-07-17 GPU-coverage audit: the a3 family (H100) was missing
  // entirely — only a2 (A100) and g2 (L4) were tracked. a3-highgpu-8g specs
  // (208 vCPU / 1872 GB / $87.8325/hr on-demand, us-central1) confirmed via
  // Google's published pricing; 1g/2g/4g scaled linearly by GPU count, same
  // proportional pattern already verified correct for the a2 family above.
  // a3-megagpu/a3-ultragpu (H200) intentionally NOT added yet — couldn't
  // confirm exact specs/pricing with enough confidence; flagged as a
  // follow-up rather than guessed.
  { type: 'a3-highgpu-1g',  vcpus: 26,  memory: 234,  price: 10.9791, cpuVendor: 'Intel', gpuCount: 1 },
  { type: 'a3-highgpu-2g',  vcpus: 52,  memory: 468,  price: 21.9581, cpuVendor: 'Intel', gpuCount: 2 },
  { type: 'a3-highgpu-4g',  vcpus: 104, memory: 936,  price: 43.9163, cpuVendor: 'Intel', gpuCount: 4 },
  { type: 'a3-highgpu-8g',  vcpus: 208, memory: 1872, price: 87.8325, cpuVendor: 'Intel', gpuCount: 8 },
];
