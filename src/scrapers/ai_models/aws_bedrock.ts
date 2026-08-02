import { BaseScraper } from '../base_scraper.ts';
import type { ScrapedAIModel } from './types.ts';
import { parseGenericAIModelTable } from './generic_table_parser.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';

/**
 * Scrapes Amazon Bedrock's model catalog + pricing page. The page is a single URL, but
 * models are split across ~19 vendor tabs (AI21 Labs, Amazon, Anthropic, Cohere, DeepSeek,
 * Google, Luma AI, Meta, MiniMax AI, Mistral AI, Moonshot AI, NVIDIA, OpenAI, Qwen, Stability
 * AI, TwelveLabs, Writer, Z AI, Custom Model Import) — each vendor's table only renders once
 * its tab is clicked. Confirmed 2026-07-29: a single-load scrape without clicking through tabs
 * was only ever catching whichever vendor rendered by default, missing most providers
 * (OpenAI, Google, NVIDIA, most of Meta/Llama, etc.) entirely. This now clicks each tab in
 * turn and re-parses after each one.
 */
const VENDOR_TAB_NAMES = [
  'AI21 Labs', 'Amazon', 'Anthropic', 'Cohere', 'DeepSeek', 'Google', 'Luma AI',
  'Meta', 'MiniMax AI', 'Mistral AI', 'Moonshot AI', 'NVIDIA', 'OpenAI', 'Qwen',
  'Stability AI', 'TwelveLabs', 'Writer', 'Z AI',
];

export class AWSBedrockScraper extends BaseScraper<ScrapedAIModel> {
  async scrape(): Promise<ScrapedAIModel[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('[AWSBedrockScraper] Navigating to Bedrock pricing page...');
    await this.page.goto('https://aws.amazon.com/bedrock/pricing/', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2500);

    const allRaw: any[] = [];

    for (const vendor of VENDOR_TAB_NAMES) {
      try {
        const tab = this.page.getByText(vendor, { exact: true }).first();
        if (await tab.count() === 0) {
          console.warn(`[AWSBedrockScraper] Tab "${vendor}" not found, skipping.`);
          continue;
        }
        await tab.click();
        await this.page.waitForTimeout(800);

        const results = (await this.page.evaluate(parseGenericAIModelTable)) as any[];
        console.log(`[AWSBedrockScraper] ${vendor}: ${results.length} rows.`);
        allRaw.push(...results);
      } catch (err: any) {
        console.warn(`[AWSBedrockScraper] Tab "${vendor}" failed: ${err.message}`);
      }
    }

    // Also parse whatever was on the page before any tab clicks (default-rendered vendor),
    // in case it's not covered above.
    const initial = (await this.page.evaluate(parseGenericAIModelTable)) as any[];
    allRaw.push(...initial);

    const withService = allRaw.map(r => ({
      ...r,
      serviceName: 'Bedrock',
      modality: normalizeModality(r.modalityRaw, r.modelName),
      modelTier: inferTier(r.modelName),
    })) as ScrapedAIModel[];

    console.log(`[AWSBedrockScraper] Parsed ${withService.length} rows across all vendor tabs.`);
    return selectCanonicalRows(withService);
  }
}

/**
 * Rows whose "name" is a metric label rather than a model.
 *
 * Bedrock's Custom Model Import tables are transposed — the metric sits in the
 * first column and the values run across — so the generic parser reads the
 * label as a model name. That produced entries literally called
 * "Price per Custom Model Unit per min*" and "Monthly storage cost per Custom
 * Model Unit", 13 identical rows each (confirmed against the live page
 * 2026-07-27). They are infrastructure pricing for hosting a custom model, not
 * models, and carry no per-token price.
 */
const METRIC_LABEL_PATTERNS: RegExp[] = [
  /^price per\b/i,
  /^monthly (storage )?cost\b/i,
  /\bper custom model unit\b/i,
  /^cost per\b/i,
  /^storage\b/i,
];

/**
 * Collapses Bedrock's multiple rows per model down to one canonical price.
 *
 * WHY THIS EXISTS: the page yields ~242 rows that reduce to ~62 distinct priced
 * model names — most models appear several times with genuinely different
 * prices. Before this, whichever row happened to parse first won, because the
 * database's unique key is effectively the model name. That is arbitrary: a
 * model could display a cross-region inference premium while the UI presented
 * it as the standard price.
 *
 * WHAT THE DUPLICATES ACTUALLY ARE: not batch or provisioned-throughput
 * variants, as first assumed. AWS prices the same model differently by
 * *inference routing* — base in-region, "Geo Cross-region inference", and
 * "Global Cross-region Inference" each get their own table. DeepSeek v3.2, for
 * example, appears at $0.62/$1.85, $0.6386/$1.9055 and $0.74/$2.22 per 1M.
 * All three are on-demand, so the site-wide on-demand-only rule (see
 * Web/CLAUDE.md) does not disambiguate them on its own.
 *
 * THE RULE: take the lowest input price among rows sharing a model name. Cross-
 * region inference is a premium charged *on top of* the base in-region rate, so
 * the lowest is the standard in-region on-demand price — which is what every
 * other provider on the site is quoted at (base region, no routing uplift).
 * Deterministic, and it cannot silently drift with page ordering.
 *
 * This is a heuristic standing in for a routing label the page does not expose
 * per row. If AWS ever publishes a cheaper cross-region tier, the assumption
 * breaks — which is why the collapse is logged rather than done silently, and
 * why the AWS Price List API remains the better long-term source.
 */
export function selectCanonicalRows(rows: ScrapedAIModel[]): ScrapedAIModel[] {
  const hasPrice = (m: ScrapedAIModel) =>
    m.inputPricePer1M != null || m.outputPricePer1M != null ||
    m.pricePerImage != null || m.pricePerUnit != null;

  let droppedLabels = 0;
  let droppedUnpriced = 0;

  const usable = rows.filter(m => {
    const name = (m.modelName ?? '').trim();
    if (METRIC_LABEL_PATTERNS.some(p => p.test(name))) { droppedLabels++; return false; }
    // A model with no price of any kind is not useful in a pricing catalogue,
    // and in practice these are parser artefacts rather than real listings.
    if (!hasPrice(m) && !m.gpuConfigPricing) { droppedUnpriced++; return false; }
    return true;
  });

  const best = new Map<string, ScrapedAIModel>();
  let collapsed = 0;

  for (const m of usable) {
    const key = m.modelName.trim().toLowerCase();
    const incumbent = best.get(key);
    if (!incumbent) { best.set(key, m); continue; }

    collapsed++;
    // Lowest input price wins; fall back to output price when input is absent
    // (image/unit-priced models), so the comparison is always like-for-like.
    const priceOf = (x: ScrapedAIModel) =>
      x.inputPricePer1M ?? x.outputPricePer1M ?? x.pricePerUnit ?? x.pricePerImage ?? Infinity;
    if (priceOf(m) < priceOf(incumbent)) best.set(key, m);
  }

  const out = [...best.values()];
  console.log(
    `[AWSBedrockScraper] ${out.length} models after canonical selection ` +
    `(${droppedLabels} metric labels, ${droppedUnpriced} unpriced rows dropped; ` +
    `${collapsed} duplicate rows collapsed to lowest in-region price).`
  );
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AWSBedrockScraper();
  scraper.run().then(() => console.log('Done')).catch(console.error);
}
