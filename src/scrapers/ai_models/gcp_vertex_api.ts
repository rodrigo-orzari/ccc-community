import type { ScrapedAIModel } from './types.ts';
import { fetchAllSkus } from '../../services/gcp_billing_catalog.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';

/**
 * Vertex AI model catalogue, sourced from Google's Cloud Billing Catalog API —
 * the same first-party API already used for Compute Engine and Cloud Run.
 *
 * REPLACES the Playwright scrape of cloud.google.com/vertex-ai/pricing. That
 * scraper ran a generic table parser over EVERY table on the page, and the page
 * includes the model-evaluation section. The result was that Google's rows in the
 * AI catalogue were largely not models at all — entries like "Pairwise Question
 * Answering Quality", "Tool Parameter Key Match" and "Summarization Verbosity"
 * are evaluation *metrics*. They also polluted the Model Tier filter with seven
 * meaningless options (Pairwise, Pointwise, Reranking, Computation-based...).
 *
 * The billing catalogue has no such ambiguity: a SKU either is a token-priced
 * model or it isn't.
 *
 * SERVICE ID is Vertex AI (`C7E2-9256-1C43`). Note the separate "Gemini API"
 * service (`AEFD-7695-64FA`) is deliberately NOT used — its SKUs are named after
 * API methods (`BidiGenerateContent`, `BatchGenerateContent`), not models, so it
 * yields nothing matchable. Vertex carries the Gemini rates anyway.
 */
const VERTEX_AI_SERVICE_ID = 'C7E2-9256-1C43';

/**
 * On-demand only, per the site-wide pricing principle. Everything here is a
 * different commercial mode for the same model, not a different model:
 *   batch / provisioned / throughput  — committed or discounted delivery
 *   caching / storage                 — a surcharge, not an inference rate
 *   tuning|tuned                      — priced off a customised model
 *   grounding                         — a retrieval add-on
 *   live | (long)                     — session/streaming variants
 */
const EXCLUDE_RE =
  /batch|caching|tuning|tuned|provisioned|commitment|throughput|storage|grounding|\blive\b|\(long\)/i;

/** "Gemini 2.5 Pro Text Input - Predictions" */
const GEMINI_RE = /^(Gemini [\w.\- ]+?) Text (Input|Output) - Predictions$/i;
/** "Cloud Vertex AI Model Garden Model as a Service Llama 4 Scout Input Token" */
const GARDEN_RE = /^Cloud Vertex AI Model Garden Model as a Service (.+?) (Input|Output) Token$/i;

const PER_TOKEN_TO_PER_MILLION = 1_000_000;

function skuPrice(sku: any): number | null {
  const tiers = sku?.pricingInfo?.[0]?.pricingExpression?.tieredRates ?? [];
  const rate = tiers[tiers.length - 1]?.unitPrice;
  if (!rate) return null;
  const p = parseInt(rate.units ?? '0', 10) + (rate.nanos ?? 0) / 1e9;
  return p > 0 ? p : null;
}

/**
 * Collapses Google's deployment-scope variants of one model into a single row.
 *
 * Vertex prices the same model several ways — "Gemini 3.5 Flash Global",
 * "... Regional", and a "GA" suffix on some. Left alone these render as distinct
 * models in the catalogue, which overstates the count and makes comparison
 * meaningless. Strip the suffix and keep the cheapest input rate, matching the
 * convention already used for AWS Bedrock's routing variants.
 */
function canonicalName(raw: string): string {
  return raw
    .replace(/\s+\b(Global|Regional)\b/gi, '')
    .replace(/\s+\bGA\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Capability-tier inference (Frontier/Standard/Efficient) and modality
// classification (Chat/Coding/Embedding/...) now live in tier_inference.ts,
// shared with every other AI model scraper — see that file for rationale.
// This Vertex-specific modality heuristic is kept local because it's more
// precise than the shared name-based fallback (Vertex's SKU names reliably
// encode embed/rerank/reasoning/coder/image markers).
function vertexModality(name: string): string {
  const n = name.toLowerCase();
  if (/embed|e5-|multilingual-e5/.test(n)) return 'Embedding';
  if (/rerank/.test(n)) return 'Reranking';
  if (/thinking|reasoning|\br1\b/.test(n)) return 'Reasoning';
  if (/coder|code/.test(n)) return 'Coding';
  if (/image|ocr|vision/.test(n)) return 'Image';
  return normalizeModality(undefined, name);
}

const MULTIMODAL_RE = /image|vision|ocr|audio|video|multimodal|gemini/i;

export class GCPVertexAIAPIScraper {
  async run(): Promise<ScrapedAIModel[]> {
    const apiKey = process.env.GCP_BILLING_API_KEY;
    if (!apiKey) throw new Error('GCP_BILLING_API_KEY is not set — cannot fetch Vertex AI pricing.');

    console.log('[GCPVertexAIAPI] Fetching Vertex AI SKUs from the Cloud Billing Catalog...');
    const skus = await fetchAllSkus(`services/${VERTEX_AI_SERVICE_ID}`, apiKey);
    console.log(`[GCPVertexAIAPI] ${skus.length} SKUs returned.`);

    // name -> { input, output } in USD per token.
    const acc = new Map<string, { input?: number; output?: number }>();

    for (const sku of skus) {
      const desc = String(sku.description ?? '').replace(/\s+/g, ' ').trim();
      if (!desc || EXCLUDE_RE.test(desc)) continue;

      const hit = desc.match(GEMINI_RE) ?? desc.match(GARDEN_RE);
      if (!hit) continue;

      const price = skuPrice(sku);
      if (price == null) continue;

      const name = canonicalName(hit[1]);
      const kind = hit[2].toLowerCase() as 'input' | 'output';

      const entry = acc.get(name) ?? {};
      // Cheapest wins when scope variants collapse onto the same canonical name.
      if (entry[kind] == null || price < (entry[kind] as number)) entry[kind] = price;
      acc.set(name, entry);
    }

    const models: ScrapedAIModel[] = [];
    for (const [name, { input, output }] of acc) {
      // Require both halves: a model with only an input rate can't be compared
      // against other providers' input+output pairs without inventing a number.
      if (input == null || output == null) continue;

      models.push({
        modelName: name,
        modelSlug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        serviceName: 'Vertex AI Model Garden',
        modelTier: inferTier(name),
        modality: vertexModality(name),
        capabilities: [],
        inputPricePer1M: input * PER_TOKEN_TO_PER_MILLION,
        outputPricePer1M: output * PER_TOKEN_TO_PER_MILLION,
        pricePerImage: null,
        pricePerUnit: null,
        priceUnitLabel: null,
        availability: ['serverless'],
        multimodal: MULTIMODAL_RE.test(name),
        gpuConfigPricing: false,
      });
    }

    models.sort((a, b) => a.modelName.localeCompare(b.modelName));

    if (models.length === 0) {
      throw new Error(
        `[GCPVertexAIAPI] Parsed 0 models from ${skus.length} Vertex AI SKUs. ` +
        'Google likely renamed the SKU descriptions — check GEMINI_RE / GARDEN_RE.'
      );
    }

    console.log(`[GCPVertexAIAPI] Parsed ${models.length} on-demand models.`);
    return models;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  new GCPVertexAIAPIScraper().run()
    .then(m => { console.table(m.map(x => ({ model: x.modelName, tier: x.modelTier, in: x.inputPricePer1M, out: x.outputPricePer1M }))); })
    .catch(e => { console.error(e); process.exit(1); });
}
