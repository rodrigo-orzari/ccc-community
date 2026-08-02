// GPU model catalog + per-provider instance-type → GPU model classification.
//
// WHY THIS EXISTS: none of our pricing sources (including the official pricing
// APIs) return a clean "H100" / "A100" style model name. AWS's Price List API
// returns a `gpuMemory` string ("640 GB HBM3") but not the chip name; Azure,
// GCP, Oracle, Alibaba and DigitalOcean return none of it. The model name is
// only recoverable from the INSTANCE TYPE NAME itself, via each provider's own
// (publicly documented, stable) naming convention — e.g. AWS p5 = H100,
// g6 = L4. This file is that mapping, kept separate from the pipelines so it
// can be audited/extended on its own.
//
// VRAM: where a provider's API exposes real per-instance GPU memory (AWS's
// gpuMemory), the adapter should prefer that over GPU_MODEL_SPECS below. This
// catalog's vramGb is the FALLBACK for providers with no such field.

export interface GpuModelSpec {
  vendor: 'NVIDIA' | 'AMD' | 'Google' | 'AWS' | 'Intel';
  vramGb: number; // per-GPU VRAM
}

// Canonical spec sheet — only models actually referenced by a provider's
// instance naming below. Add here first when a new model needs classifying.
export const GPU_MODEL_SPECS: Record<string, GpuModelSpec> = {
  'H200': { vendor: 'NVIDIA', vramGb: 141 },
  'H100': { vendor: 'NVIDIA', vramGb: 80 },
  'A100 80GB': { vendor: 'NVIDIA', vramGb: 80 },
  'A100 40GB': { vendor: 'NVIDIA', vramGb: 40 },
  'L40S': { vendor: 'NVIDIA', vramGb: 48 },
  'L4': { vendor: 'NVIDIA', vramGb: 24 },
  'A10G': { vendor: 'NVIDIA', vramGb: 24 },
  'A10': { vendor: 'NVIDIA', vramGb: 24 },
  'T4': { vendor: 'NVIDIA', vramGb: 16 },
  'V100': { vendor: 'NVIDIA', vramGb: 16 },
  'V100 32GB': { vendor: 'NVIDIA', vramGb: 32 },
  'K80': { vendor: 'NVIDIA', vramGb: 12 },
  'RTX 6000 Ada': { vendor: 'NVIDIA', vramGb: 48 },
  'RTX 4000 Ada': { vendor: 'NVIDIA', vramGb: 20 },
  'MI300X': { vendor: 'AMD', vramGb: 192 },
  'MI325X': { vendor: 'AMD', vramGb: 256 },
  'TPU v5e': { vendor: 'Google', vramGb: 16 },
  'TPU v5p': { vendor: 'Google', vramGb: 95 },
  'Trainium2': { vendor: 'AWS', vramGb: 96 },
  'Inferentia2': { vendor: 'AWS', vramGb: 32 },
  'Gaudi3': { vendor: 'Intel', vramGb: 128 },
};

export type GpuClassification = { model: string; vramGb: number } | null;

// --- AWS --------------------------------------------------------------
// Public EC2 GPU/accelerator instance families, per AWS docs (P/G/Trn/Inf
// series). Longest/most-specific prefixes first so e.g. 'g5g' (Graviton+T4G,
// ARM) doesn't fall through to the 'g5' (A10G) branch.
export function classifyAwsGpu(instanceType: string): GpuClassification {
  const t = instanceType.toLowerCase();
  if (t.startsWith('p5en') || t.startsWith('p5.') || t.startsWith('p5.')) return { model: 'H100', vramGb: 80 };
  if (t.startsWith('p5e')) return { model: 'H200', vramGb: 141 };
  if (t.startsWith('p4de')) return { model: 'A100 80GB', vramGb: 80 };
  if (t.startsWith('p4d')) return { model: 'A100 40GB', vramGb: 40 };
  if (t.startsWith('p3dn') || t.startsWith('p3.')) return { model: 'V100', vramGb: 16 };
  if (t.startsWith('g6e')) return { model: 'L40S', vramGb: 48 };
  if (t.startsWith('g6')) return { model: 'L4', vramGb: 24 };
  if (t.startsWith('g5g')) return { model: 'T4', vramGb: 16 }; // Graviton + T4G
  if (t.startsWith('g5')) return { model: 'A10G', vramGb: 24 };
  if (t.startsWith('g4dn')) return { model: 'T4', vramGb: 16 };
  if (t.startsWith('g4ad')) return null; // AMD Radeon Pro V520 — not an NVIDIA/AMD-compute model in our catalog
  if (t.startsWith('trn2')) return { model: 'Trainium2', vramGb: 96 };
  if (t.startsWith('trn1')) return null; // Trainium1 — no VRAM spec tracked yet
  if (t.startsWith('inf2')) return { model: 'Inferentia2', vramGb: 32 };
  if (t.startsWith('inf1')) return null;
  return null;
}

// --- Azure --------------------------------------------------------------
// N-series naming: NC = compute (V100/A100/H100), ND = deep learning
// (A100/H100/H200), NV = visualization (T4/A10). Live API, so this only
// needs to cover SKU families actually returned, not enumerate every size.
export function classifyAzureGpu(instanceType: string): GpuClassification {
  const t = instanceType.toLowerCase().replace(/^standard_/, '');
  if (/^nd.*h200/.test(t)) return { model: 'H200', vramGb: 141 };
  if (/^nd.*h100/.test(t) || /^ndh100/.test(t)) return { model: 'H100', vramGb: 80 };
  if (/^nc.*h100/.test(t)) return { model: 'H100', vramGb: 80 };
  if (/^nd.*a100/.test(t) || /^nda100/.test(t)) return { model: 'A100 80GB', vramGb: 80 };
  if (/^nc.*a100/.test(t)) return { model: 'A100 80GB', vramGb: 80 };
  if (/^nc.*t4/.test(t) || /^ncas_t4/.test(t)) return { model: 'T4', vramGb: 16 };
  if (/^nv.*a10/.test(t) || /^nva10/.test(t)) return { model: 'A10', vramGb: 24 };
  if (/^nc\d+s?_v3/.test(t) || /^nc\d+ads_v4/.test(t)) return { model: 'V100', vramGb: 16 };
  if (/^nc\d+s?_v2/.test(t)) return { model: 'V100', vramGb: 16 };
  if (/^nv\d+s?_v3/.test(t)) return { model: 'T4', vramGb: 16 };
  if (/^nd\d+s?_v2/.test(t)) return { model: 'V100 32GB', vramGb: 32 };
  if (t.startsWith('nc') || t.startsWith('nd') || t.startsWith('nv')) return null; // N-series but unrecognized generation
  return null;
}

// --- GCP --------------------------------------------------------------
// a2 = A100 40GB, a2-ultragpu/a2-megagpu = A100 80GB, a3 = H100/H200, g2 = L4.
export function classifyGcpGpu(instanceType: string): GpuClassification {
  const t = instanceType.toLowerCase();
  if (t.startsWith('a3-megagpu') || t.startsWith('a3-ultra')) return { model: 'H200', vramGb: 141 };
  if (t.startsWith('a3-')) return { model: 'H100', vramGb: 80 };
  if (t.startsWith('a2-ultragpu') || t.startsWith('a2-megagpu')) return { model: 'A100 80GB', vramGb: 80 };
  if (t.startsWith('a2-')) return { model: 'A100 40GB', vramGb: 40 };
  if (t.startsWith('g2-')) return { model: 'L4', vramGb: 24 };
  return null;
}

// --- Oracle (OCI) --------------------------------------------------------
// Shape names spell the model out directly (VM.GPU.A10.1, BM.GPU.H100.8, …).
export function classifyOracleGpu(instanceType: string): GpuClassification {
  const t = instanceType.toUpperCase();
  if (t.includes('H200')) return { model: 'H200', vramGb: 141 };
  if (t.includes('H100')) return { model: 'H100', vramGb: 80 };
  if (t.includes('A100-V2') || t.includes('A100')) return { model: 'A100 80GB', vramGb: 80 };
  if (t.includes('L40S')) return { model: 'L40S', vramGb: 48 };
  if (t.includes('A10')) return { model: 'A10', vramGb: 24 };
  return null;
}

// --- Alibaba Cloud --------------------------------------------------------
// gn7i = A10, gn7e/gn7 = A100 80GB, gn6i = T4, gn6e = V100 32GB.
export function classifyAlibabaGpu(instanceType: string): GpuClassification {
  const t = instanceType.toLowerCase();
  if (t.includes('gn8v') || t.includes('gn8is')) return { model: 'H100', vramGb: 80 };
  if (t.includes('gn7e') || t.includes('.gn7-')) return { model: 'A100 80GB', vramGb: 80 };
  if (t.includes('gn7i')) return { model: 'A10', vramGb: 24 };
  if (t.includes('gn6e')) return { model: 'V100 32GB', vramGb: 32 };
  if (t.includes('gn6i')) return { model: 'T4', vramGb: 16 };
  return null;
}

// --- DigitalOcean --------------------------------------------------------
// GPU Droplet slugs spell the model out ('gpu-h100-80gb', 'gpu-a100-80gb', …).
export function classifyDigitalOceanGpu(slug: string): GpuClassification {
  const t = slug.toLowerCase();
  if (t.includes('h200')) return { model: 'H200', vramGb: 141 };
  if (t.includes('h100')) return { model: 'H100', vramGb: 80 };
  if (t.includes('mi300x')) return { model: 'MI300X', vramGb: 192 };
  if (t.includes('mi325x')) return { model: 'MI325X', vramGb: 256 };
  if (t.includes('l40s')) return { model: 'L40S', vramGb: 48 };
  if (t.includes('rtx6000') || t.includes('rtx-6000')) return { model: 'RTX 6000 Ada', vramGb: 48 };
  if (t.includes('rtx4000') || t.includes('rtx-4000') || t.includes('a4000')) return { model: 'RTX 4000 Ada', vramGb: 20 };
  if (t.includes('a100-80gb') || t.includes('a100')) return { model: 'A100 80GB', vramGb: 80 };
  return null;
}
