import type { Sql } from 'postgres';
import { BaseAdapter, PricingRecord, PricingPipeline } from './pricing_pipeline';
import { AI_MODELS } from '../config/ai_models';
import { DigitalOceanGenAIAPI } from '../scrapers/ai_models/digitalocean_genai_api';
import { AWSBedrockScraper } from '../scrapers/ai_models/aws_bedrock';
import { AzureAIFoundryScraper } from '../scrapers/ai_models/azure_ai_foundry';
import { GCPVertexAIAPIScraper } from '../scrapers/ai_models/gcp_vertex_api';
import { OracleGenAIAPI } from '../scrapers/ai_models/oracle_genai_api';
import { AlibabaModelStudioScraper } from '../scrapers/ai_models/alibaba_model_studio';
import type { ScrapedAIModel } from '../scrapers/ai_models/types';

/**
 * Coerces a yes/no attribute to the canonical 'Yes' | 'No' string.
 *
 * Accepts what either ingest path actually produces — real booleans from the
 * scrapers, 'Yes'/'No' strings from static config — plus the stringified
 * 'true'/'false' that a JSON round-trip can introduce. Anything genuinely
 * unknown (null, undefined, 'N/A') is passed through untouched rather than
 * being forced to 'No', since "we don't know" and "no" are different claims.
 */
function toYesNo(v: unknown): unknown {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === 'yes') return 'Yes';
    if (s === 'false' || s === 'no') return 'No';
  }
  return v;
}

// providerSlug -> scraper class, in the same order they appear in AI_MODELS/the DB.
const PROVIDER_SCRAPERS: Record<string, new () => { run(): Promise<ScrapedAIModel[]> }> = {
  aws: AWSBedrockScraper,
  azure: AzureAIFoundryScraper,
  // API-based, not scraped: the old Playwright scrape of the Vertex pricing page
  // parsed every table on it, including model *evaluation metrics*, so Google's
  // catalogue entries were things like 'Pairwise Question Answering Quality'.
  gcp: GCPVertexAIAPIScraper,
  // API-based, not scraped: oracle.com's GenAI pricing page injects every
  // dollar figure via client-side JS after render (the model names are in the
  // static HTML, every price cell isn't), so no headless-browser wait could
  // ever see them. Oracle's own public price-list API (no credentials needed)
  // backs oracle.com/cloud/price-list itself and returns the same numbers directly.
  oracle: OracleGenAIAPI,
  // API rather than a scraper: DigitalOcean's public model page renders no
  // catalogue to a headless browser (the table lives behind the portal), so
  // the scraper always returned 0 and fell back to 6 static models. The API
  // returns the real 95.
  digitalocean: DigitalOceanGenAIAPI,
  alibaba: AlibabaModelStudioScraper,
};

function scrapedModelToRecord(providerSlug: string, geography: string, m: ScrapedAIModel): PricingRecord {
  // Price column semantics vary a lot by model type; fall back through the shapes in priority
  // order and stash whatever unit label applies in attributes so the UI can render it correctly.
  let price = 0;
  let unit = '1M Tokens';
  if (m.inputPricePer1M !== null) {
    price = m.inputPricePer1M;
    unit = '1M Tokens';
  } else if (m.pricePerImage !== null) {
    price = m.pricePerImage;
    unit = 'Image';
  } else if (m.pricePerUnit !== null) {
    price = m.pricePerUnit;
    unit = m.priceUnitLabel || 'Unit';
  }

  return {
    provider: providerSlug,
    service: m.serviceName,
    region: 'global',
    instanceType: m.modelName,
    vcpus: 0,
    memoryGb: 0,
    arch: 'N/A',
    os: 'N/A',
    cpuVendor: 'N/A',
    gpuCount: 0,
    geography,
    category: 'ai',
    price,
    unit,
    dataSource: 'live_api' as const,
    attributes: {
      modelTier: m.modelTier,
      modality: m.modality,
      capabilities: m.capabilities,
      outputPricePer1M: m.outputPricePer1M,
      // Scrapers type this as `boolean` (scrapers/ai_models/types.ts) while the
      // static fallback in config/ai_models.ts stores 'Yes'/'No'. Storing both
      // raw gave the Multimodal filter four options — Yes/No/true/false — and
      // made "Yes" silently exclude every scraped model. Normalize on write so
      // one concept has one representation.
      multimodal: toYesNo(m.multimodal),
      availability: m.availability,
      gpuConfigPricing: m.gpuConfigPricing,
    },
  };
}

export class AILiveAdapter extends BaseAdapter {
  providerSlug: string;
  private geography: string;

  constructor(providerSlug: string, geography: string) {
    super();
    this.providerSlug = providerSlug;
    this.geography = geography;
  }

  async fetchPricing(): Promise<PricingRecord[]> {
    const ScraperClass = PROVIDER_SCRAPERS[this.providerSlug];
    if (!ScraperClass) return [];

    console.log(`🔄 Attempting live AI model catalog scrape for ${this.providerSlug}...`);
    try {
      const scraper = new ScraperClass();
      const models = await scraper.run();
      if (models.length === 0) {
        console.warn(`⚠️  ${this.providerSlug} AI scraper returned 0 models. Falling back to static config.`);
        recordScrapeFailure(this.providerSlug, 'returned 0 models');
        return [];
      }
      return models.map(m => scrapedModelToRecord(this.providerSlug, this.geography, m));
    } catch (e: any) {
      const reason = String(e?.message ?? e);
      console.warn(`⚠️  ${this.providerSlug} AI live scrape failed: ${reason}. Falling back to static config...`);
      recordScrapeFailure(this.providerSlug, reason);
      return [];
    }
  }
}

/**
 * Scrape failures recorded during a run, reported together at the end of
 * ingestion.
 *
 * WHY: a failed scrape falls back to a handful of hardcoded models and the run
 * still prints "✅ Saved N records" — so the catalog silently shrinks while the
 * log looks healthy. That is how DigitalOcean's ~70-model catalogue was
 * represented by 6 static entries across multiple ingests without anyone
 * noticing. The per-provider warning scrolls past in a thousand-line log; a
 * consolidated report at the end does not.
 */
const scrapeFailures: Array<{ provider: string; reason: string }> = [];

function recordScrapeFailure(provider: string, reason: string) {
  // Trim: Playwright errors carry multi-line call logs that swamp the summary.
  const firstLine = reason.split('\n')[0].slice(0, 180);
  scrapeFailures.push({ provider, reason: firstLine });
}

/** Returns and clears the failures recorded so far. */
export function drainAIScrapeFailures(): Array<{ provider: string; reason: string }> {
  return scrapeFailures.splice(0, scrapeFailures.length);
}

function staticModelToRecord(model: (typeof AI_MODELS)[number]): PricingRecord {
  return {
    provider: model.providerSlug,
    service: model.serviceName,
    region: model.regionSlug || 'global',
    instanceType: model.modelName,
    vcpus: 0,
    memoryGb: 0,
    arch: 'N/A',
    os: 'N/A',
    cpuVendor: 'N/A',
    gpuCount: 0,
    geography: model.geography,
    category: 'ai',
    price: model.inputPricePer1M,
    unit: '1M Tokens',
    dataSource: 'static_config' as const,
    attributes: {
      modelTier: model.modelTier,
      modality: model.modality,
      contextWindowK: model.contextWindowK,
      outputPricePer1M: model.outputPricePer1M,
      multimodal: toYesNo(model.multimodal),
      trainingCutoff: model.trainingCutoff,
    },
  };
}

export class AIStaticAdapter extends BaseAdapter {
  providerSlug = 'all'; // handled by mapped items
  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching AI pricing (${AI_MODELS.length} entries from static config)...`);
    return AI_MODELS.map(staticModelToRecord);
  }
}

export class AIPricingPipeline extends PricingPipeline {
  constructor(sql: Sql) {
    super(sql);
    this.adapters = [];
  }

  private async saveGrouped(records: PricingRecord[]) {
    // Group by provider AND service — saveRecords() labels an entire batch with
    // records[0].service, so mixed services under one provider (e.g. Bedrock's
    // 'Foundational Models' + 'Embeddings') must be saved as separate batches or the
    // non-first services become unreachable via the Service Type filter.
    const recordsByGroup: Record<string, PricingRecord[]> = {};
    for (const record of records) {
      const key = `${record.provider}||${record.service}`;
      if (!recordsByGroup[key]) recordsByGroup[key] = [];
      recordsByGroup[key].push(record);
    }
    // Insert counts are captured per group rather than derived from group size:
    // Azure AI in particular fetches models that collide on the DB unique key
    // (28 parsed → 9 dropped → 19 inserted on the 2026-07-28 run), and the
    // summary previously reported the 28. See saveRecords().
    const insertedByGroup = new Map<string, number>();
    for (const [key, groupRecords] of Object.entries(recordsByGroup)) {
      insertedByGroup.set(key, await this.saveRecords(groupRecords, 'ai'));
    }
    return Object.entries(recordsByGroup).map(([key, g]) => ({
      provider: g[0].provider,
      service: g[0].service,
      status: 'success' as const,
      count: insertedByGroup.get(key) ?? 0,
      dataSource: g[0].dataSource,
    }));
  }

  async run() {
    const results: any[] = [];
    const staticByProvider: Record<string, typeof AI_MODELS> = {};
    for (const model of AI_MODELS) {
      if (!staticByProvider[model.providerSlug]) staticByProvider[model.providerSlug] = [];
      staticByProvider[model.providerSlug].push(model);
    }

    for (const providerSlug of Object.keys(PROVIDER_SCRAPERS)) {
      const sampleModel = staticByProvider[providerSlug]?.[0];
      const geography = sampleModel?.geography || 'Global';

      try {
        const liveAdapter = new AILiveAdapter(providerSlug, geography);
        const liveRecords = await liveAdapter.fetchPricing();

        if (liveRecords.length > 0) {
          results.push(...(await this.saveGrouped(liveRecords)));
          continue;
        }
      } catch (error: any) {
        console.error(`❌ AI live scrape failed for ${providerSlug}:`, error);
      }

      // Fall back to this provider's slice of the static config.
      const staticModels = staticByProvider[providerSlug] || [];
      if (staticModels.length === 0) continue;

      try {
        const staticRecords = staticModels.map(staticModelToRecord);
        results.push(...(await this.saveGrouped(staticRecords)));
      } catch (error: any) {
        console.error(`❌ AI static fallback failed for ${providerSlug}:`, error);
        results.push({
          provider: providerSlug,
          service: 'Artificial Intelligence',
          status: 'error',
          message: `Both live scrape and static fallback failed: ${(error as Error).message}`,
        });
      }
    }

    // OpenAI/Anthropic/Radium aren't scraped (small, vendor-owned catalogs, not a third-party
    // marketplace) — always save their static entries directly. Radium missing here (added
    // 2026-07-29) was why it never showed up in the AI category despite being in AI_MODELS —
    // this loop is the only place static-only providers actually get inserted.
    for (const providerSlug of ['openai', 'anthropic', 'radium']) {
      const staticModels = staticByProvider[providerSlug] || [];
      if (staticModels.length === 0) continue;
      const staticRecords = staticModels.map(staticModelToRecord);
      results.push(...(await this.saveGrouped(staticRecords)));
    }

    return results;
  }
}
