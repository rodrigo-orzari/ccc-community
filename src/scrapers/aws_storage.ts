import axios from 'axios';
import { BaseScraper } from './base_scraper.ts';

export class AwsStorageScraper extends BaseScraper<any> {
  // Override run to bypass Playwright headless browser initialization entirely,
  // since this scraper only uses standard HTTP API requests via axios.
  async run(): Promise<any[]> {
    return this.scrape();
  }

  async scrape(): Promise<any[]> {
    console.log('[AwsStorageScraper] Fetching AWS S3 and EFS pricing API...');
    const s3Url = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/index.json';
    const efsUrl = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEFS/current/index.json';

    const [{ data: s3Data }, { data: efsData }] = await Promise.all([
      axios.get(s3Url),
      axios.get(efsUrl)
    ]);
    
    const records: any[] = [];
    
    // Parse S3
    for (const sku in s3Data.products) {
      const p = s3Data.products[sku];
      if (p.attributes.location === 'US East (N. Virginia)' && p.productFamily === 'Storage') {
        const terms = s3Data.terms.OnDemand[sku];
        if (!terms) continue;
        const priceDim = Object.values(terms)[0] as any;
        const priceDetails = Object.values(priceDim.priceDimensions)[0] as any;
        const price = parseFloat(priceDetails.pricePerUnit.USD);
        
        // Only get capacity pricing (GB-Month)
        const unit = priceDetails.unit?.toLowerCase();
        if (price === 0 || !unit?.includes('gb-mo')) continue;

        let tier = 'Standard';
        const storageClass = p.attributes.storageClass || '';
        const volumeType = p.attributes.volumeType || '';
        
        if (storageClass.includes('Infrequent') || volumeType.includes('Infrequent')) tier = 'Infrequent Access';
        if (storageClass.includes('Archive') || volumeType.includes('Archive')) tier = 'Archive';
        if (storageClass.includes('Glacier') || volumeType.includes('Glacier')) tier = 'Cold';
        
        // S3 constraint logic
        let minDays = undefined;
        if (tier === 'Infrequent Access') minDays = 30;
        if (storageClass.includes('Glacier') && !storageClass.includes('Deep')) minDays = 90;
        if (storageClass.includes('Deep Archive')) minDays = 180;

        records.push({
          type: volumeType || storageClass || 'S3 Standard',
          category: 'Object',
          price,
          unit: priceDetails.unit || 'GB-Mo',
          attributes: {
            storage_type: 'Object',
            tier,
            redundancy: p.attributes.availability === 'Single Availability Zone' ? 'Single-Zone' : 'Zone-Redundant',
            ...(minDays ? { min_storage_duration_days: minDays } : {})
          }
        });
      }
    }

    // EFS
    for (const sku in efsData.products) {
      const p = efsData.products[sku];
      if (p.attributes.location === 'US East (N. Virginia)' && p.productFamily === 'Storage') {
        const terms = efsData.terms.OnDemand[sku];
        if (!terms) continue;
        const priceDim = Object.values(terms)[0] as any;
        const priceDetails = Object.values(priceDim.priceDimensions)[0] as any;
        const price = parseFloat(priceDetails.pricePerUnit.USD);
        
        const unit = priceDetails.unit?.toLowerCase();
        if (price === 0 || !unit?.includes('gb-mo')) continue;
        
        let tier = p.attributes.storageClass === 'Infrequent Access' ? 'Infrequent Access' : 'Standard';
        records.push({
          type: 'EFS ' + p.attributes.storageClass,
          category: 'File',
          price,
          unit: priceDetails.unit || 'GB-Mo',
          attributes: {
            storage_type: 'File',
            tier,
            redundancy: p.attributes.availability === 'Single Availability Zone' ? 'Single-Zone' : 'Zone-Redundant',
          }
        });
      }
    }

    // EBS (Hardcoded due to 1.5GB AmazonEC2 index.json file size limitation in Node.js)
    records.push(
      { type: 'EBS gp3', category: 'Block', price: 0.08, unit: 'GB-Mo', attributes: { storage_type: 'Block', tier: 'Standard', redundancy: 'Single-Zone', media: 'SSD', included_iops: 3000 } },
      { type: 'EBS gp2', category: 'Block', price: 0.10, unit: 'GB-Mo', attributes: { storage_type: 'Block', tier: 'Standard', redundancy: 'Single-Zone', media: 'SSD', included_iops: 100 } },
      { type: 'EBS io2', category: 'Block', price: 0.125, unit: 'GB-Mo', attributes: { storage_type: 'Block', tier: 'Provisioned IOPS', redundancy: 'Single-Zone', media: 'SSD' } },
      { type: 'EBS st1', category: 'Block', price: 0.045, unit: 'GB-Mo', attributes: { storage_type: 'Block', tier: 'Throughput Optimized', redundancy: 'Single-Zone', media: 'HDD' } },
      { type: 'EBS sc1', category: 'Block', price: 0.015, unit: 'GB-Mo', attributes: { storage_type: 'Block', tier: 'Cold', redundancy: 'Single-Zone', media: 'HDD' } }
    );

    // De-duplicate S3 tiers (AWS tiered pricing e.g. first 50TB, next 450TB)
    const uniqueRecordsMap = new Map();
    for (const r of records) {
      if (!uniqueRecordsMap.has(r.type) || uniqueRecordsMap.get(r.type).price > r.price) {
        uniqueRecordsMap.set(r.type, r);
      }
    }

    return Array.from(uniqueRecordsMap.values());
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AwsStorageScraper();
  scraper.run().then(res => console.log(res)).catch(console.error);
}
