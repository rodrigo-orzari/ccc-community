import { BaseScraper } from '../base_scraper.ts';
import type { ScrapedAIModel } from './types.ts';
import { parseGenericAIModelTable } from './generic_table_parser.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';

/**
 * Scrapes Google Cloud Vertex AI's pricing page, which covers Gemini/PaLM plus the
 * Model Garden's third-party catalog. Verify column detection against the live DOM —
 * Vertex's pricing page groups tables per model family rather than one master table.
 */
export class GCPVertexAIScraper extends BaseScraper<ScrapedAIModel> {
  async scrape(): Promise<ScrapedAIModel[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('[GCPVertexAIScraper] Navigating to Vertex AI pricing page...');
    await this.page.goto('https://cloud.google.com/vertex-ai/pricing', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2500);

    const results = (await this.page.evaluate(parseGenericAIModelTable)) as any[];
    const withService = results.map(r => ({
      ...r,
      serviceName: 'Vertex AI Model Garden',
      modality: normalizeModality(r.modalityRaw, r.modelName),
      modelTier: inferTier(r.modelName),
    })) as ScrapedAIModel[];

    console.log(`[GCPVertexAIScraper] Parsed ${withService.length} models.`);
    return withService;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new GCPVertexAIScraper();
  scraper.run().then(() => console.log('Done')).catch(console.error);
}
