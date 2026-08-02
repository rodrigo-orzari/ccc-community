import { BaseScraper } from './base_scraper.ts';

export interface DigitalOceanInstanceConfig {
  slug: string;
  vcpus: number;
  memory: number; // in GB
  price: number;  // hourly USD
  category: string;
}

export class DigitalOceanDropletsScraper extends BaseScraper<DigitalOceanInstanceConfig> {
  async scrape(): Promise<DigitalOceanInstanceConfig[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('[DigitalOceanScraper] Navigating to droplets pricing page...');
    await this.page.goto('https://www.digitalocean.com/pricing/droplets', { waitUntil: 'domcontentloaded' });
    
    // Wait for pricing tables to appear
    await this.page.waitForTimeout(2000); // give React/Vue time to hydrate if any

    const results: DigitalOceanInstanceConfig[] = await this.page.evaluate(() => {
      const parsed: Array<{slug: string, vcpus: number, memory: number, price: number, category: string}> = [];
      const tables = Array.from(document.querySelectorAll('table'));
      
      tables.forEach((table, index) => {
        // Skip the backups/snapshots table at the bottom
        if (index === 5) return;

        let category = 'General purpose';
        if (index === 1) category = 'General purpose'; // Dedicated General
        if (index === 2) category = 'Compute optimized';
        if (index === 3) category = 'Memory optimized';
        if (index === 4) category = 'Storage optimized';

        const rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
        rows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td'));
          if (cells.length < 6) return;

          const memText = cells[0].textContent?.trim() || '';
          const vcpuText = cells[1].textContent?.trim() || '';
          // prices are typically near the end
          const hrPriceText = cells[cells.length - 2].textContent?.trim() || '';

          // Parse memory
          let memory = 0;
          if (memText.includes('GiB')) memory = parseFloat(memText.replace(/[^0-9.]/g, ''));
          else if (memText.includes('MiB')) memory = parseFloat(memText.replace(/[^0-9.]/g, '')) / 1024;

          // Parse vcpus
          const vcpus = parseInt(vcpuText.replace(/[^0-9]/g, ''), 10) || 1;

          // Parse price
          const price = parseFloat(hrPriceText.replace(/[^0-9.]/g, '')) || 0;

          if (memory > 0 && vcpus > 0 && price > 0) {
            // DO slugs are usually like c-2vcpu-4gb
            let catPrefix = 's';
            if (category === 'Compute optimized') catPrefix = 'c';
            else if (category === 'Memory optimized') catPrefix = 'm';
            else if (category === 'Storage optimized') catPrefix = 'so';
            else if (index === 1) catPrefix = 'g'; // Dedicated General
            
            const slug = `${catPrefix}-${vcpus}vcpu-${Math.floor(memory)}gb`;

            parsed.push({ slug, vcpus, memory, price, category });
          }
        });
      });
      return parsed;
    });

    console.log(`[DigitalOceanScraper] Parsed ${results.length} droplets!`);
    console.log(results.slice(0, 5)); // show first 5
    
    return results;
  }
}

// Quick manual runner for testing:
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new DigitalOceanDropletsScraper();
  scraper.run().then(() => console.log('Done')).catch(console.error);
}
