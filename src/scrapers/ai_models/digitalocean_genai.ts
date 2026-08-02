import { BaseScraper } from '../base_scraper.ts';
import type { ScrapedAIModel } from './types.ts';
import { inferTier, normalizeModality } from './tier_inference.ts';

/**
 * DEAD CODE — confirmed 2026-07-29: not in ai_pipeline.ts's PROVIDER_SCRAPERS map
 * (DigitalOceanGenAIAPI in digitalocean_genai_api.ts replaced this and is what's
 * actually wired in). Left in place for reference only; do not re-wire without
 * checking whether the portal-only catalog page this scrapes still exists at all.
 *
 * Scrapes DigitalOcean's GenAI Platform model catalog (Serverless Inference).
 * Table columns confirmed by manual inspection (2026-07-24): Name | Type | Capabilities |
 * Benchmarks | Price | Availability, paginated (~9 pages, 8 rows/page). Price cell is either
 * "$X/M input tokens" + "$Y/M output tokens", "$X/image", "$X/video", "$X/1K chars", or
 * "Based on GPU Configuration" for GPU-priced dedicated-only models.
 */
export class DigitalOceanGenAIScraper extends BaseScraper<ScrapedAIModel> {
  async scrape(): Promise<ScrapedAIModel[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('[DigitalOceanGenAIScraper] Navigating to GenAI Platform model catalog...');
    await this.page.goto('https://www.digitalocean.com/products/gen-ai/models', { waitUntil: 'domcontentloaded' });
    // The model table is client-rendered — wait for actual rows, not a fixed delay.
    await this.waitForContent('table tbody tr, [role="row"]', 2);

    const allResults: ScrapedAIModel[] = [];
    const MAX_PAGES = 15; // safety cap; real catalog observed at 9 pages

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const rawPageResults: any[] = await this.page.evaluate(() => {
        const parsed: any[] = [];
        const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'));

        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
          if (cells.length < 5) return;

          const nameCell = cells[0];
          const modelName = nameCell.querySelector('a')?.textContent?.trim() || nameCell.textContent?.trim().split('\n')[0] || '';
          if (!modelName) return;

          const slugMatch = nameCell.textContent?.match(/[a-z0-9][a-z0-9.\-]{2,}/i);
          const modelSlug = slugMatch ? slugMatch[0].toLowerCase() : modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          // Raw "Type" column text — a modality value (Chat, Coding, Embedding,
          // ...), not a capability tier. Normalized to the canonical modality
          // vocabulary and a genuine Frontier/Standard/Efficient tier outside
          // this page.evaluate() closure, once the row leaves the browser
          // context (see tier_inference.ts).
          const modalityRaw = cells[1]?.textContent?.trim() || 'Chat';
          const capabilitiesText = cells[2]?.textContent?.replace(/\s+/g, ' ').trim() || '';
          const capabilities = capabilitiesText.split(',').map(c => c.trim()).filter(Boolean).filter(c => c !== '--');

          const priceText = (cells[4]?.textContent || cells[cells.length - 2]?.textContent || '').replace(/\s+/g, ' ').trim();
          const availText = (cells[cells.length - 1]?.textContent || '').toLowerCase();

          let inputPricePer1M: number | null = null;
          let outputPricePer1M: number | null = null;
          let pricePerImage: number | null = null;
          let pricePerUnit: number | null = null;
          let priceUnitLabel: string | null = null;
          let gpuConfigPricing = false;

          const inputMatch = priceText.match(/\$([\d.]+)\/M input/i);
          const outputMatch = priceText.match(/\$([\d.]+)\/M output/i);
          const imageMatch = priceText.match(/\$([\d.]+)\/image/i);
          const videoMatch = priceText.match(/\$([\d.]+)\/video/i);
          const charsMatch = priceText.match(/\$([\d.]+)\/1K chars/i);

          if (inputMatch) inputPricePer1M = parseFloat(inputMatch[1]);
          if (outputMatch) outputPricePer1M = parseFloat(outputMatch[1]);
          if (imageMatch) pricePerImage = parseFloat(imageMatch[1]);
          if (videoMatch) { pricePerUnit = parseFloat(videoMatch[1]); priceUnitLabel = 'video'; }
          if (charsMatch) { pricePerUnit = parseFloat(charsMatch[1]); priceUnitLabel = '1K chars'; }
          if (/based on gpu configuration/i.test(priceText)) gpuConfigPricing = true;

          const availability: ('serverless' | 'dedicated')[] = [];
          if (availText.includes('serverless')) availability.push('serverless');
          if (availText.includes('dedicated')) availability.push('dedicated');
          if (availability.length === 0) availability.push('serverless');

          parsed.push({
            modelName,
            modelSlug,
            serviceName: 'GenAI Platform',
            modalityRaw,
            capabilities,
            inputPricePer1M,
            outputPricePer1M,
            pricePerImage,
            pricePerUnit,
            priceUnitLabel,
            availability,
            multimodal: capabilities.some(c => /vision|image|multimodal/i.test(c)),
            gpuConfigPricing,
          });
        });

        return parsed;
      });

      const pageResults: ScrapedAIModel[] = rawPageResults.map(r => ({
        ...r,
        modality: normalizeModality(r.modalityRaw, r.modelName),
        modelTier: inferTier(r.modelName),
      }));

      allResults.push(...pageResults);
      console.log(`[DigitalOceanGenAIScraper] Page ${pageNum}: parsed ${pageResults.length} models (running total ${allResults.length})`);

      // Advance pagination — stop once the "next" control is gone or disabled.
      const nextButton = await this.page.$('button[aria-label="Next page"]:not([disabled]), a[aria-label="Next page"]:not([aria-disabled="true"])');
      if (!nextButton) break;

      // Fingerprint the current first row so we can tell when the NEXT page has
      // actually rendered. A fixed delay re-parses the same page when the fetch
      // is slow, producing duplicate rows that then get silently deduped on
      // insert — the page count looks right while the model count is wrong.
      const firstRowBefore = await this.page.$eval(
        'table tbody tr, [role="row"]',
        el => el.textContent?.trim() ?? ''
      ).catch(() => '');

      await nextButton.click();

      try {
        await this.page.waitForFunction(
          (prev: string) => {
            const row = document.querySelector('table tbody tr, [role="row"]');
            return !!row && (row.textContent?.trim() ?? '') !== prev;
          },
          firstRowBefore,
          { timeout: 15000 }
        );
      } catch {
        console.warn(`[DigitalOceanGenAIScraper] Page ${pageNum + 1} did not change within 15s — stopping pagination.`);
        break;
      }
    }

    console.log(`[DigitalOceanGenAIScraper] Done. Parsed ${allResults.length} models total across pages.`);
    return allResults;
  }
}

// Quick manual runner for testing:
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new DigitalOceanGenAIScraper();
  scraper.run().then(() => console.log('Done')).catch(console.error);
}
