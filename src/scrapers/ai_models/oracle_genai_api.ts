import type { ScrapedAIModel } from './types.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';
import { fetchOracleCatalog, findPrice, type OracleProduct } from '../../services/oracle_price_list';

/**
 * Oracle Generative AI Service pricing via Oracle's official public price
 * list API. Replaces OracleGenAIScraper, which scraped
 * oracle.com/.../pricing/ — a page whose dollar figures are injected by
 * client-side JS after the initial render (confirmed 2026-07-29: fetching the
 * page's static HTML returns every model NAME but every "Unit price" cell is
 * empty, and the interactive cost-estimator page it previously targeted
 * doesn't render a table to a headless browser at all).
 *
 * Reuses fetchOracleCatalog() from services/oracle_price_list.ts — the same
 * cached apexapps.oracle.com feed that already powers Oracle compute/database/
 * storage live pricing — rather than a second, separate fetch of the same
 * public API. It needs no API key (Generative AI list pricing is public;
 * that's distinct from OCI_* credentials, which are for account-specific
 * compute pricing and dedicated-cluster billing, not this).
 */

function priceOf(p: OracleProduct): number | null {
  return findPrice([p], () => true);
}

/**
 * Groups the API's flat per-metric rows (one row per input/output/cached-token
 * tier) back into one ScrapedAIModel per base model — mirrors what every other
 * provider's pricing page already presents as a single row.
 */
export class OracleGenAIAPI {
  async fetchModels(): Promise<ScrapedAIModel[]> {
    const items = await fetchOracleCatalog();
    const genAiItems = items.filter(p => p.serviceCategory === 'OCI Generative AI - Models');
    if (genAiItems.length === 0) {
      throw new Error(`Oracle price list API returned no "OCI Generative AI - Models" rows (${items.length} total products) — the category name may have changed.`);
    }

    // Oracle's own feed is inconsistent about whitespace and which of two
    // equivalent prefixes ("OCI Generative AI" vs "Oracle Cloud Infrastructure
    // Generative AI") a row uses — confirmed 2026-07-29 by pulling the live
    // API: "OCI Generative AI - xAI - Grok 4.3" and "OCI  Generative AI - xAI
    // - Grok 4.3" (double space) are the SAME model's two token-tier rows, and
    // without normalizing they'd become two separate, half-priced catalogue
    // entries. This does not fully fix every case — a few rows also drop the
    // space around a hyphen entirely (e.g. "Google -Gemini 2.5 Pro"), which
    // still splits into a second entry; accepted as a known gap rather than
    // chasing increasingly fragile hyphen-spacing regex for 1-2 rows.
    const normalize = (s: string) =>
      s.replace(/\s+/g, ' ').replace(/^(Oracle Cloud Infrastructure Generative AI|OCI Generative AI)/i, 'OCI Generative AI').trim();

    // Dedicated-cluster and bespoke-deployment rows aren't a per-token/per-
    // transaction list price comparable to the other five providers; skip
    // rather than force them into a shape they don't fit.
    const isDedicatedOrCustom = (name: string) => /dedicated|model import/i.test(name);
    // Not model catalogue entries at all — Retrieval/Search/Storage add-ons
    // that share the same serviceCategory in Oracle's price list.
    const isInfraAddon = (name: string) => /web search|file search|memory (ingestion|retention)|vector store|code execution|x search/i.test(name);
    // Cache-hit/cache-write pricing is a discount off the standard input
    // price, not a separate model — every other provider's catalogue entry
    // here is the standard (non-cached) rate.
    const isCached = (name: string) => /cached input/i.test(name);

    type Combined = { base: string; input: number | null; output: number | null; unit: 'token' | 'transaction' | 'search-unit' };
    const combined = new Map<string, Combined>();

    for (const p of genAiItems) {
      const name = normalize(p.displayName ?? '');
      const metric = (p.metricName ?? '').trim();
      if (!name || isDedicatedOrCustom(name) || isInfraAddon(name) || isCached(name)) continue;

      const price = priceOf(p);
      if (price == null) continue;

      if (/rerank/i.test(name)) {
        // Rerank models: one combined price, not input/output — keyed on
        // partNumber so each rerank tier stays a distinct catalogue entry.
        combined.set(name, { base: name, input: price, output: null, unit: 'search-unit' });
        continue;
      }

      if (/1,?000,?000 tokens/i.test(metric)) {
        // Token-priced (Grok, Gemini, gpt-oss): strip the "- Input/Output
        // Tokens ... " suffix to get the base model name, and prefer the
        // lower/base tier when a model has multiple context-length tiers —
        // same simplification the other providers' scrapers already make.
        const isOutput = /output tokens/i.test(name);
        const isInput = /input tokens/i.test(name);
        if (!isInput && !isOutput) continue;

        const base = name.replace(/\s*-\s*(Input|Output)\s*Tokens.*$/i, '').trim();
        const isHigherTier = /greater than/i.test(name);

        const existing = combined.get(base) ?? { base, input: null, output: null, unit: 'token' as const };
        // Lower tier wins if we see both; first-seen wins against a later
        // higher-tier row for the same field.
        if (isInput && (existing.input == null || !isHigherTier)) existing.input = price;
        if (isOutput && (existing.output == null || !isHigherTier)) existing.output = price;
        combined.set(base, existing);
        continue;
      }

      if (/10,?000 transactions/i.test(metric)) {
        // Legacy Cohere/Meta family: billed as ONE combined per-transaction
        // (character) price covering prompt + response together — there is no
        // separate input/output split to report, so this goes through
        // pricePerUnit rather than being forced into inputPricePer1M.
        combined.set(name, { base: name, input: price, output: null, unit: 'transaction' });
        continue;
      }
      // Any other unit (per-hour, per-GB, per-request infra pricing) isn't a
      // per-model catalogue price — skip.
    }

    const results: ScrapedAIModel[] = [];
    for (const c of combined.values()) {
      const modelSlug = c.base.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      if (c.unit === 'token') {
        if (c.input == null && c.output == null) continue;
        results.push({
          modelName: c.base.replace(/^OCI Generative AI\s*-\s*/i, ''),
          modelSlug,
          serviceName: 'Generative AI Service',
          modelTier: inferTier(c.base),
          modality: normalizeModality(null, c.base),
          capabilities: [],
          inputPricePer1M: c.input,
          outputPricePer1M: c.output,
          pricePerImage: null,
          pricePerUnit: null,
          priceUnitLabel: null,
          availability: ['serverless'],
          multimodal: /vision|multimodal|image|video|audio/i.test(c.base),
          gpuConfigPricing: false,
        });
      } else {
        // transaction (10K chars) or search-unit (1K rerank calls) pricing —
        // both are a single combined price, surfaced via pricePerUnit.
        results.push({
          modelName: c.base.replace(/^OCI Generative AI\s*-\s*/i, ''),
          modelSlug,
          serviceName: 'Generative AI Service',
          modelTier: inferTier(c.base),
          modality: normalizeModality(null, c.base),
          capabilities: [],
          inputPricePer1M: null,
          outputPricePer1M: null,
          pricePerImage: null,
          pricePerUnit: c.input,
          priceUnitLabel: c.unit === 'transaction' ? '10K transactions' : '1K search units',
          availability: ['serverless'],
          multimodal: false,
          gpuConfigPricing: false,
        });
      }
    }

    console.log(`[OracleGenAIAPI] ${results.length} models from ${genAiItems.length} price-list rows (public API, no credentials needed).`);

    if (results.length === 0) {
      throw new Error('Oracle price list API returned rows but none parsed into usable models — refusing to report success with an empty catalogue.');
    }

    return results;
  }

  /** Matches the BaseScraper/DigitalOceanGenAIAPI contract so the pipeline can call it interchangeably. */
  async run(): Promise<ScrapedAIModel[]> {
    return this.fetchModels();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  new OracleGenAIAPI().run()
    .then(models => {
      console.log(`\nAll ${models.length} models:`);
      for (const m of models) {
        const price = m.inputPricePer1M != null
          ? `$${m.inputPricePer1M}/$${m.outputPricePer1M ?? '-'} per 1M tokens`
          : `$${m.pricePerUnit} per ${m.priceUnitLabel}`;
        console.log(`  ${m.modelName.padEnd(40)} ${m.modelTier.padEnd(10)} ${price}`);
      }
    })
    .catch(err => { console.error(err); process.exit(1); });
}
