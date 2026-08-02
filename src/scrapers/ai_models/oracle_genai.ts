import { BaseScraper } from '../base_scraper.ts';
import type { ScrapedAIModel } from './types.ts';
import { parseGenericAIModelTable } from './generic_table_parser.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';

/**
 * Scrapes Oracle's Generative AI service pricing page. Oracle's model catalog is the
 * smallest of the six, so this table-scan approach is more likely to match on first run
 * than the wider marketplaces (Bedrock/AI Foundry/Vertex) — still worth a DOM check.
 */
export class OracleGenAIScraper extends BaseScraper<ScrapedAIModel> {
  async scrape(): Promise<ScrapedAIModel[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('[OracleGenAIScraper] Navigating to Oracle Generative AI pricing page...');
    // The old URL (.../generative-ai/pricing/) now 404s — Oracle moved this
    // page under /generative-ai-service/. Verified 2026-07-26. Note the page
    // is heavily client-rendered behind iframes and yields no HTML table to a
    // headless browser, so this scraper is expected to fail until replaced by
    // an API-based source; the URL is corrected so the failure is "page won't
    // render" rather than the misleading "page not found".
    await this.page.goto('https://www.oracle.com/artificial-intelligence/generative-ai/generative-ai-service/pricing/', { waitUntil: 'domcontentloaded' });
    // Wait for pricing table rows rather than a fixed delay — see
    // BaseScraper.waitForContent for why the delay approach failed silently.
    await this.waitForContent('table tbody tr, [role="row"]', 2);

    const results = (await this.page.evaluate(parseGenericAIModelTable)) as any[];
    const withService = results.map(r => ({
      ...r,
      serviceName: 'Generative AI Service',
      modality: normalizeModality(r.modalityRaw, r.modelName),
      modelTier: inferTier(r.modelName),
    })) as ScrapedAIModel[];

    console.log(`[OracleGenAIScraper] Parsed ${withService.length} models.`);
    return withService;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new OracleGenAIScraper();
  scraper.run().then(() => console.log('Done')).catch(console.error);
}
