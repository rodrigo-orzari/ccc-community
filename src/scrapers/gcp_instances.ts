import { BaseScraper } from './base_scraper.ts';

export interface GcpInstanceConfig {
  type: string;
  vcpus: number;
  memory: number;
  price: number;
  cpuVendor: 'Intel' | 'AMD' | 'Ampere';
  gpuCount?: number;
}

export class GcpInstancesScraper extends BaseScraper<GcpInstanceConfig> {
  async scrape(): Promise<GcpInstanceConfig[]> {
    if (!this.page) throw new Error('Page not initialized');

    const urls = [
      'https://cloud.google.com/products/compute/pricing/general-purpose',
      'https://cloud.google.com/products/compute/pricing/compute-optimized',
      'https://cloud.google.com/products/compute/pricing/memory-optimized',
      'https://cloud.google.com/products/compute/pricing/accelerator-optimized'
    ];

    const allInstances: GcpInstanceConfig[] = [];

    for (const url of urls) {
      console.log(`[GcpScraper] Navigating to ${url}...`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(3000); // Wait for dynamic pricing tables

      const results = await this.page.evaluate(() => {
        const parsed: any[] = [];
        const tables = Array.from(document.querySelectorAll('table'));
        
        tables.forEach(table => {
          const rows = Array.from(table.querySelectorAll('tr')).slice(1);
          rows.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td, th'));
            if (cells.length < 4) return; // need at least type, vcpu, mem, price

            const typeText = cells[0].textContent?.trim() || '';
            const vcpuText = cells[1].textContent?.trim() || '';
            const memText = cells[2].textContent?.trim() || '';
            const priceText = cells[3].textContent?.trim() || ''; // Default/On-demand is usually col 4

            if (typeText && vcpuText && memText && priceText.includes('$')) {
              parsed.push({ typeText, vcpuText, memText, priceText });
            }
          });
        });
        return parsed;
      });

      for (const res of results) {
        const type = res.typeText.toLowerCase();
        // Skip rows that aren't actual instances (like headers or notes)
        if (!type.includes('-')) continue;

        const vcpus = parseInt(res.vcpuText.replace(/[^0-9]/g, ''), 10);
        let memory = 0;
        if (res.memText.includes('GiB') || res.memText.includes('GB')) {
          memory = parseFloat(res.memText.replace(/[^0-9.]/g, ''));
        }

        // Price formatting in GCP: "$0.096866 / 1 hour"
        const priceStr = res.priceText.split('/')[0].replace(/[^0-9.]/g, '');
        const price = parseFloat(priceStr);

        if (vcpus > 0 && memory > 0 && price > 0) {
          // Determine CPU vendor
          let cpuVendor: 'Intel' | 'AMD' | 'Ampere' = 'Intel';
          if (type.includes('n2d') || type.includes('c2d') || type.includes('t2d')) cpuVendor = 'AMD';
          if (type.includes('t2a')) cpuVendor = 'Ampere';

          // Determine GPU count
          let gpuCount = 0;
          if (url.includes('accelerator-optimized')) {
            // Rough heuristic: A2 has 1-16 GPUs, G2 has 1-8
            const match = type.match(/-([0-9]+)g/);
            if (match) gpuCount = parseInt(match[1], 10);
            else if (type.endsWith('-4')) gpuCount = 1; // g2-standard-4
            else if (type.endsWith('-8')) gpuCount = 1;
            else if (type.endsWith('-16')) gpuCount = 1;
            else if (type.endsWith('-24')) gpuCount = 2;
            else if (type.endsWith('-48')) gpuCount = 4;
            else if (type.endsWith('-96')) gpuCount = 8;
          }

          allInstances.push({
            type,
            vcpus,
            memory,
            price,
            cpuVendor,
            ...(gpuCount > 0 ? { gpuCount } : {})
          });
        }
      }
    }

    // Deduplicate by type (some tables might repeat)
    const unique = new Map<string, GcpInstanceConfig>();
    for (const inst of allInstances) {
      if (!unique.has(inst.type)) unique.set(inst.type, inst);
    }
    const finalInstances = Array.from(unique.values());

    console.log(`[GcpScraper] Scraped ${finalInstances.length} total instances.`);
    return finalInstances;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new GcpInstancesScraper();
  scraper.run().then(res => console.log(res.slice(0, 5))).catch(console.error);
}
