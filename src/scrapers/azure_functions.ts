import axios from 'axios';
import { BaseScraper } from './base_scraper.ts';

export class AzureFunctionsScraper extends BaseScraper<any> {
  async scrape(): Promise<any[]> {
    console.log('[AzureFunctionsScraper] Fetching Azure Retail API for Functions...');
    
    const url = "https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Azure Functions' and armRegionName eq 'eastus'";
    let items: any[] = [];
    let currentUrl: string | null = url;

    while (currentUrl) {
      const { data } = await axios.get(currentUrl);
      items = items.concat(data.Items);
      currentUrl = data.NextPageLink || null;
    }

    let gbSecPrice = 0.000016; // default

    for (const item of items) {
      // Look for "Consumption Plan" memory duration
      if (item.skuName.includes('Consumption') && item.meterName === 'Memory Duration') {
        gbSecPrice = item.retailPrice;
      }
    }

    console.log(`[AzureFunctionsScraper] Live Rates - Memory: $${gbSecPrice}/GB-sec`);

    // Convert GB-sec to GB-hr
    const gbHrRate = gbSecPrice * 3600;

    const generateConfigs = () => {
      const sizesMb = [128, 256, 512, 1024, 2048, 3072, 4096];
      return sizesMb.map(mb => {
        const gb = mb / 1024;
        return {
          type: `AzureFunctions-${mb}MB`,
          vcpus: gb * 0.5,
          memory: gb,
          cpuVendor: 'Intel',
          price: gb * gbHrRate,
        };
      });
    };

    return generateConfigs();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AzureFunctionsScraper();
  scraper.run().then(res => console.log(res.slice(0, 3))).catch(console.error);
}
