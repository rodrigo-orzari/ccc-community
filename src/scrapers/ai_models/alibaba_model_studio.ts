import { BaseScraper } from '../base_scraper.ts';
import type { ScrapedAIModel } from './types.ts';
import { parseGenericAIModelTable } from './generic_table_parser.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';

/**
 * Scrapes Alibaba Cloud Model Studio's model pricing page (Qwen family plus
 * third-party and open-weight models).
 *
 * Was previously pointed at /model-studio/models — the "Supported Models and
 * Capabilities Overview" page, which lists what each model can do and has NO
 * pricing table at all, which is why this timed out waiting for one (confirmed
 * 2026-07-29). The real prices live at /model-studio/model-pricing.
 *
 * That page mixes two formats: the flagship Qwen-Max models are presented as
 * dense prose/bullet lists per region (not machine-parseable without a lot of
 * fragile region-specific regex), while every other model ("More models"
 * subsections, repeated per region) is a genuine <table> with Model ID/Input
 * price/Output price columns that the shared generic parser already handles.
 * This scraper deliberately only captures the table rows — partial coverage
 * with correct prices beats guessing at the bullet-list prose and risking a
 * wrong number on a pricing site.
 */
export class AlibabaModelStudioScraper extends BaseScraper<ScrapedAIModel> {
  async scrape(): Promise<ScrapedAIModel[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('[AlibabaModelStudioScraper] Navigating to Model Studio pricing page...');
    await this.page.goto('https://www.alibabacloud.com/help/en/model-studio/model-pricing', { waitUntil: 'domcontentloaded' });
    // Wait for model table rows rather than a fixed delay — see
    // BaseScraper.waitForContent for why the delay approach failed silently.
    await this.waitForContent('table tbody tr, [role="row"]', 2);

    const results = (await this.page.evaluate(parseGenericAIModelTable)) as any[];
    const withService = results.map(r => ({
      ...r,
      serviceName: 'Model Studio',
      modality: normalizeModality(r.modalityRaw, r.modelName),
      modelTier: inferTier(r.modelName),
    })) as ScrapedAIModel[];

    console.log(`[AlibabaModelStudioScraper] Parsed ${withService.length} models.`);
    return withService;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AlibabaModelStudioScraper();
  scraper.run().then(() => console.log('Done')).catch(console.error);
}
