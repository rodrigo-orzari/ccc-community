/**
 * Shared shape every AI-model-catalog scraper normalizes into, regardless of how
 * differently each vendor structures their pricing page. See ai_pipeline.ts for how
 * this gets mapped into a PricingRecord and inserted alongside the static fallback.
 */
export interface ScrapedAIModel {
  modelName: string;
  modelSlug: string;
  serviceName: string; // e.g. 'Bedrock', 'AI Foundry', 'Vertex AI Model Garden', 'GenAI Platform', 'Model Studio', 'Generative AI Service'
  modelTier: string; // Capability tier only: Frontier, Standard, Efficient. See tier_inference.ts.
  modality: string; // Model type/use case: Chat, Coding, Embedding, Reranking, Image, Audio, Reasoning. See tier_inference.ts.
  capabilities: string[];
  inputPricePer1M: number | null; // USD per 1M input tokens, null if priced per-image/per-unit instead
  outputPricePer1M: number | null;
  pricePerImage: number | null;
  pricePerUnit: number | null; // catch-all for /video, /1K chars, etc.
  priceUnitLabel: string | null; // 'image', 'video', '1K chars', etc. when pricePerUnit is set
  availability: ('serverless' | 'dedicated')[];
  multimodal: boolean;
  gpuConfigPricing: boolean; // true when the vendor only shows "Based on GPU Configuration" (no list price)
}
