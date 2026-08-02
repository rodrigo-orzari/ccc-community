export const ALIBABA_REGION = 'ap-southeast-1';
export const ALIBABA_GEOGRAPHY = 'Asia Pacific';

export const ALIBABA_INSTANCES = [
  // General Purpose (g7)
  { type: 'ecs.g7.large', vcpus: 2, memory: 8, price: 0.108, cpuVendor: 'Intel', gpuCount: 0 },
  { type: 'ecs.g7.xlarge', vcpus: 4, memory: 16, price: 0.216, cpuVendor: 'Intel', gpuCount: 0 },
  { type: 'ecs.g7.2xlarge', vcpus: 8, memory: 32, price: 0.432, cpuVendor: 'Intel', gpuCount: 0 },

  // Compute Optimized (c7)
  { type: 'ecs.c7.large', vcpus: 2, memory: 4, price: 0.088, cpuVendor: 'Intel', gpuCount: 0 },
  { type: 'ecs.c7.xlarge', vcpus: 4, memory: 8, price: 0.176, cpuVendor: 'Intel', gpuCount: 0 },
  { type: 'ecs.c7.2xlarge', vcpus: 8, memory: 16, price: 0.352, cpuVendor: 'Intel', gpuCount: 0 },

  // Memory Optimized (r7)
  { type: 'ecs.r7.large', vcpus: 2, memory: 16, price: 0.144, cpuVendor: 'Intel', gpuCount: 0 },
  { type: 'ecs.r7.xlarge', vcpus: 4, memory: 32, price: 0.288, cpuVendor: 'Intel', gpuCount: 0 },
  { type: 'ecs.r7.2xlarge', vcpus: 8, memory: 64, price: 0.576, cpuVendor: 'Intel', gpuCount: 0 },

  // ARM General Purpose (g8y)
  { type: 'ecs.g8y.large', vcpus: 2, memory: 8, price: 0.082, cpuVendor: 'Ampere', gpuCount: 0 },
  { type: 'ecs.g8y.xlarge', vcpus: 4, memory: 16, price: 0.164, cpuVendor: 'Ampere', gpuCount: 0 },

  // GPU Instances (gn7i - A10)
  { type: 'ecs.gn7i-c8g1.2xlarge', vcpus: 8, memory: 30, price: 1.15, cpuVendor: 'Intel', gpuCount: 1 },

  // NOTE (2026-07-17 GPU-coverage audit): Alibaba's gn7e family (NVIDIA A100
  // 80GB) is a confirmed real gap — we only track the gn7i (A10) shape above.
  // Not adding a static entry here: found a CNY hourly rate for
  // ecs.gn7e-c16g1.4xlarge but could not independently confirm its memory_gb
  // spec, and a wrong spec is worse than a missing row. See audit notes for
  // follow-up — needs either a verified spec sheet or (better) wiring gn7e
  // into the same BSS live-pricing call the gn7i row already uses.
];
