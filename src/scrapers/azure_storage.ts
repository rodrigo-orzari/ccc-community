import axios from 'axios';
import { BaseScraper } from './base_scraper.ts';

export class AzureStorageScraper extends BaseScraper<any> {
  // Override run to bypass Playwright headless browser initialization entirely,
  // since this scraper only uses standard HTTP API requests via axios.
  async run(): Promise<any[]> {
    return this.scrape();
  }

  async scrape(): Promise<any[]> {
    console.log('[AzureStorageScraper] Fetching Azure Retail Prices API for Storage...');
    
    // Azure Retail Prices API for Storage in US East
    // We filter by serviceFamily eq 'Storage' and armRegionName eq 'eastus'
    const baseUrl = 'https://prices.azure.com/api/retail/prices?$filter=serviceFamily eq \'Storage\' and armRegionName eq \'eastus\'';
    let url = baseUrl;
    let items: any[] = [];
    
    // Fetch up to 5 pages to get a good sample of storage records
    let pages = 0;
    while (url && pages < 5) {
      const response = await axios.get(url);
      items = items.concat(response.data.Items);
      url = response.data.NextPageLink;
      pages++;
    }

    const records: any[] = [];
    const uniqueRecordsMap = new Map();

    for (const item of items) {
      // Filter for capacity pricing only (GB/Month)
      if (item.unitOfMeasure !== '1 GB/Month' || item.type !== 'Consumption' || item.retailPrice === 0) {
        continue;
      }

      const meterName = item.meterName.toLowerCase();
      const productName = item.productName.toLowerCase();
      
      let category = 'Object';
      let tier = 'Hot';
      let redundancy = 'LRS';
      let media = undefined;
      let iops = undefined;

      if (meterName.includes('zrs')) redundancy = 'ZRS';
      if (meterName.includes('grs')) redundancy = 'GRS';
      if (meterName.includes('ragrs') || meterName.includes('ra-grs')) redundancy = 'RA-GRS';
      if (meterName.includes('gzrs')) redundancy = 'GZRS';

      if (productName.includes('managed disks') || meterName.includes('disk')) {
        category = 'Block';
        if (productName.includes('premium ssd v2')) { media = 'NVMe'; tier = 'Premium V2'; }
        else if (productName.includes('premium')) { media = 'SSD'; tier = 'Premium'; }
        else if (productName.includes('standard ssd')) { media = 'SSD'; tier = 'Standard'; }
        else { media = 'HDD'; tier = 'Standard'; }
      } else if (productName.includes('files')) {
        category = 'File';
        if (productName.includes('premium')) tier = 'Premium';
        else tier = 'Standard';
      } else {
        category = 'Object';
        if (meterName.includes('cool')) tier = 'Cool';
        if (meterName.includes('cold')) tier = 'Cold';
        if (meterName.includes('archive')) tier = 'Archive';
      }

      const type = item.productName;
      if (!uniqueRecordsMap.has(type) || uniqueRecordsMap.get(type).price > item.retailPrice) {
        uniqueRecordsMap.set(type, {
          type,
          category,
          price: item.retailPrice,
          unit: 'GB-Mo',
          attributes: {
            storage_type: category,
            tier,
            redundancy,
            ...(media ? { media } : {})
          }
        });
      }
    }

    return Array.from(uniqueRecordsMap.values());
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AzureStorageScraper();
  scraper.run().then(res => console.log(res.slice(0, 5))).catch(console.error);
}
