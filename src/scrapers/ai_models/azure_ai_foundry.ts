import { BaseScraper } from '../base_scraper.ts';
import type { ScrapedAIModel } from './types.ts';
import { parseGenericAIModelTable } from './generic_table_parser.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';

/**
 * Scrapes Azure AI Foundry pricing across ALL vendor tabs, not just "Microsoft".
 * Confirmed 2026-07-29: the pricing site splits models across 12 separate vendor
 * pages (Model Router, AOAI, DeepSeek, Microsoft, Grok, Llama, Black Forest Labs,
 * Mistral AI, Cohere, Kimi, Fine-tuning models, Fireworks). Scraping only
 * "microsoft" was missing Azure OpenAI/GPT and everything else. AOAI has no table
 * of its own — it links out to the separate Azure OpenAI Service pricing page,
 * so that URL is included here directly instead.
 */
const VENDOR_PAGES: { slug: string; url: string }[] = [
  { slug: 'model-router', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/model-router/' },
  { slug: 'aoai', url: 'https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/' },
  { slug: 'deepseek', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/deepseek/' },
  { slug: 'microsoft', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/' },
  { slug: 'grok', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/grok/' },
  { slug: 'llama', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/llama/' },
  { slug: 'black-forest-labs', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/black-forest-labs/' },
  { slug: 'mistral-ai', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/mistral-ai/' },
  { slug: 'cohere', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/cohere/' },
  { slug: 'kimi', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/kimi/' },
  { slug: 'fireworks', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/fireworks/' },
];

export class AzureAIFoundryScraper extends BaseScraper<ScrapedAIModel> {
  async scrape(): Promise<ScrapedAIModel[]> {
    if (!this.page) throw new Error('Page not initialized');

    const all: ScrapedAIModel[] = [];
    let pagesWithPrices = 0;

    for (const vendor of VENDOR_PAGES) {
      try {
        console.log(`[AzureAIFoundryScraper] Navigating to ${vendor.slug}...`);
        await this.page.goto(vendor.url, { waitUntil: 'domcontentloaded' });

        await this.page.waitForFunction(
          () => Array.from(document.querySelectorAll('table td')).filter(td => /\$\s*\d/.test(td.textContent || '')).length >= 2,
          { timeout: 20000 }
        );

        const results = (await this.page.evaluate(parseGenericAIModelTable)) as any[];
        const withService = results.map(r => ({
          ...r,
          serviceName: 'AI Foundry',
          modality: normalizeModality(r.modalityRaw, r.modelName),
          modelTier: inferTier(r.modelName),
        })) as ScrapedAIModel[];

        const withPrice = withService.filter(m => !m.gpuConfigPricing);
        console.log(`[AzureAIFoundryScraper] ${vendor.slug}: ${withPrice.length} priced models.`);
        if (withPrice.length > 0) pagesWithPrices++;
        all.push(...withPrice);
      } catch (err: any) {
        console.warn(`[AzureAIFoundryScraper] ${vendor.slug} skipped: ${err.message}`);
      }
    }

    console.log(`[AzureAIFoundryScraper] Done. ${all.length} priced models across ${pagesWithPrices}/${VENDOR_PAGES.length} vendor pages.`);
    if (all.length === 0) {
      throw new Error('[AzureAIFoundryScraper] No priced models found on any vendor page — refusing to report success.');
    }
    return all;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AzureAIFoundryScraper();
  scraper.run().then(() => console.log('Done')).catch(console.error);
}
