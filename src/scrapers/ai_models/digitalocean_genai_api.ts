import type { ScrapedAIModel } from './types.ts';
import { inferTier } from './tier_inference.ts';

/**
 * DigitalOcean GenAI model catalogue via the official API.
 *
 * Replaces DigitalOceanGenAIScraper, which could never work: the public
 * marketing page at /products/gen-ai/models returns ~4KB of navigation chrome
 * with no model table at all (the catalogue a logged-in user sees lives behind
 * the portal). The scraper therefore returned 0 models on every run and the
 * pipeline quietly fell back to 6 hardcoded entries — while DigitalOcean
 * actually offers 95.
 *
 * The API returns everything the page did and more: structured pricing,
 * capabilities, modalities, context window, benchmark scores and
 * serverless/dedicated availability. It needs DIGITALOCEAN_API_TOKEN
 * (read-only scope is sufficient — nothing here writes).
 */

const API_URL = 'https://api.digitalocean.com/v2/gen-ai/models';

interface DOModel {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  capabilities?: string[];
  modalities?: { input?: string[]; output?: string[] };
  model_availability?: string;
  lifecycle_status?: string;
  pricing?: {
    input_price_per_million?: number;
    output_price_per_million?: number;
    cache_read_input_price_per_million?: number;
  };
}

/**
 * DigitalOcean's pricing fields are named "*_per_million" but hold price
 * PER TOKEN.
 *
 * Verified against known public list prices (2026-07-27): Claude Sonnet 4
 * reports 3.0e-06 and lists at $3.00/1M; GPT-4o reports 2.5e-06 and lists at
 * $2.50/1M; Claude Opus 4 reports 1.5e-05 and lists at $15.00/1M. Every one
 * matches after multiplying by 1e6.
 *
 * Taking the field name at face value would have priced the entire
 * DigitalOcean catalogue at fractions of a cent, making it appear to
 * dramatically undercut every other provider on the site.
 */
const PER_TOKEN_TO_PER_MILLION = 1_000_000;

/**
 * Sanity bounds on the converted per-1M price, in USD.
 *
 * If DigitalOcean ever corrects the field to genuinely mean per-million, our
 * multiplication becomes a 1,000,000x error. These bounds turn that into a
 * loud, obvious failure instead of a catalogue full of $3,000,000 models.
 * Range is deliberately wide — real models run from ~$0.01 to ~$100 per 1M.
 */
const MIN_PRICE_PER_1M = 0.0001;
const MAX_PRICE_PER_1M = 1000;

function toPricePer1M(raw: number | undefined | null, modelName: string, field: string): number | null {
  if (raw == null || raw <= 0) return null;

  const converted = raw * PER_TOKEN_TO_PER_MILLION;

  if (converted < MIN_PRICE_PER_1M || converted > MAX_PRICE_PER_1M) {
    console.warn(
      `⚠️  [DigitalOceanGenAIAPI] ${modelName}: ${field}=${raw} converts to $${converted} per 1M, ` +
      `outside the sane range $${MIN_PRICE_PER_1M}–$${MAX_PRICE_PER_1M}. ` +
      `DigitalOcean may have changed the field's units. Dropping this price rather than publishing it.`
    );
    return null;
  }

  // Sub-cent precision matters at the per-1M scale; round to 6dp to avoid
  // float noise like 0.6500000000000001.
  return Math.round(converted * 1e6) / 1e6;
}

/**
 * Maps DigitalOcean's `type` / capabilities / modalities onto the canonical
 * modality vocabulary used site-wide (Chat/Coding/Embedding/Reranking/
 * Reasoning/Image/Audio). NOT a capability tier — see inferTier below for
 * that, which is a separate axis.
 */
function toModality(m: DOModel): string {
  const type = (m.type ?? '').toLowerCase();
  const caps = (m.capabilities ?? []).map(c => c.toLowerCase());
  const outputs = (m.modalities?.output ?? []).map(o => o.toLowerCase());

  if (outputs.includes('image')) return 'Image';
  if (outputs.includes('audio') || outputs.includes('speech')) return 'Audio';
  if (type.includes('embedding') || caps.includes('embedding')) return 'Embedding';
  if (type.includes('rerank') || caps.includes('reranking')) return 'Reranking';
  if (type.includes('reasoning') || caps.includes('reasoning')) return 'Reasoning';
  if (caps.includes('coding')) return 'Coding';
  return 'Chat';
}

export class DigitalOceanGenAIAPI {
  async fetchModels(): Promise<ScrapedAIModel[]> {
    const token = process.env.DIGITALOCEAN_API_TOKEN;
    if (!token) {
      throw new Error('DIGITALOCEAN_API_TOKEN not set — cannot fetch the GenAI model catalogue.');
    }

    // per_page=200 covers the current catalogue (95) in one request. Paginate
    // anyway so growth past 200 doesn't silently truncate the list — the exact
    // class of failure this file exists to fix.
    const models: DOModel[] = [];
    let page = 1;
    const MAX_PAGES = 20;

    while (page <= MAX_PAGES) {
      const res = await fetch(`${API_URL}?per_page=200&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(45_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `DigitalOcean API returned ${res.status} ${res.statusText}` +
          (res.status === 401 ? ' — token missing, expired or revoked.' : '') +
          (body ? ` Body: ${body.slice(0, 200)}` : '')
        );
      }

      const json: any = await res.json();
      const batch: DOModel[] = json.models ?? [];
      models.push(...batch);

      const totalPages = json.meta?.pages ?? 1;
      if (page >= totalPages || batch.length === 0) break;
      page++;
    }

    const results: ScrapedAIModel[] = [];
    let skippedInactive = 0;
    let skippedNoPrice = 0;

    for (const m of models) {
      const name = (m.name ?? '').trim();
      if (!name) continue;

      // Retired/deprecated models still appear in the catalogue but should not
      // be presented as purchasable options.
      if (m.lifecycle_status && m.lifecycle_status.toLowerCase() !== 'active') {
        skippedInactive++;
        continue;
      }

      const inputPricePer1M = toPricePer1M(m.pricing?.input_price_per_million, name, 'input');
      const outputPricePer1M = toPricePer1M(m.pricing?.output_price_per_million, name, 'output');

      // Some models are dedicated-only and priced by GPU configuration rather
      // than per token — mirrors the "Based on GPU Configuration" rows on
      // DigitalOcean's own pricing UI.
      const availabilityRaw = (m.model_availability ?? '').toLowerCase();
      const gpuConfigPricing = inputPricePer1M == null && outputPricePer1M == null;

      if (gpuConfigPricing && availabilityRaw !== 'dedicated') {
        // No usable price and not explicitly a dedicated-GPU product — nothing
        // meaningful to publish.
        skippedNoPrice++;
        continue;
      }

      const availability: ('serverless' | 'dedicated')[] = [];
      if (availabilityRaw.includes('serverless')) availability.push('serverless');
      if (availabilityRaw.includes('dedicated')) availability.push('dedicated');
      if (availability.length === 0) availability.push('serverless');

      const inputs = (m.modalities?.input ?? []).map(i => i.toLowerCase());
      const outputs = (m.modalities?.output ?? []).map(o => o.toLowerCase());

      results.push({
        modelName: name,
        modelSlug: (m.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase(),
        serviceName: 'GenAI Platform',
        modelTier: inferTier(name),
        modality: toModality(m),
        capabilities: m.capabilities ?? [],
        inputPricePer1M,
        outputPricePer1M,
        pricePerImage: null,
        pricePerUnit: null,
        priceUnitLabel: null,
        availability,
        multimodal: inputs.length > 1 || outputs.length > 1 || inputs.includes('image'),
        gpuConfigPricing,
      });
    }

    console.log(
      `[DigitalOceanGenAIAPI] ${results.length} models from API ` +
      `(${models.length} returned; ${skippedInactive} inactive, ${skippedNoPrice} without usable pricing).`
    );

    if (results.length === 0) {
      throw new Error('DigitalOcean API returned no usable models — refusing to report success with an empty catalogue.');
    }

    return results;
  }

  /** Matches the BaseScraper contract so the pipeline can call it interchangeably. */
  async run(): Promise<ScrapedAIModel[]> {
    return this.fetchModels();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  new DigitalOceanGenAIAPI().run()
    .then(models => {
      console.log(`\nFirst 10 of ${models.length}:`);
      for (const m of models.slice(0, 10)) {
        const price = m.inputPricePer1M != null
          ? `$${m.inputPricePer1M}/$${m.outputPricePer1M ?? '-'} per 1M`
          : 'GPU-config pricing';
        console.log(`  ${m.modelName.padEnd(38)} ${m.modelTier.padEnd(10)} ${price}`);
      }
    })
    .catch(err => { console.error(err); process.exit(1); });
}
