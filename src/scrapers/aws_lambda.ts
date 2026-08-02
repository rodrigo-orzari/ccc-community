import axios from 'axios';
import { BaseScraper } from './base_scraper.ts';

// DEAD CODE — confirmed 2026-07-29: not imported by ai_pipeline.ts, serverless_pipeline.ts,
// or anywhere else that's actually wired into `npm run ingest`. The active AWS Lambda live
// path is AWSLambdaLiveAdapter in services/serverless_adapters_live.ts, which divides AWS's
// raw pricePerUnit.USD by 10 for GB-second billing — this file does NOT do that division
// (treats pricePerUnit as a direct per-GB-second rate). Do not resurrect this class without
// first reconciling that discrepancy; if it's ever re-wired as-is it will silently misprice
// AWS Lambda by 10x. Left in place for reference only.
export class AwsLambdaScraper extends BaseScraper<any> {
  async scrape(): Promise<any[]> {
    console.log('[AwsLambdaScraper] Fetching AWS Lambda pricing API...');
    
    const lambdaUrl = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSLambda/current/index.json';
    const { data: lambdaData } = await axios.get(lambdaUrl);
    
    // Default fallback rates (per GB-second)
    let x86Rate = 0.0000166667;
    let armRate = 0.0000133334;

    for (const sku in lambdaData.products) {
      const p = lambdaData.products[sku];
      // Search for US East 1 pricing
      if (p.attributes.location === 'US East (N. Virginia)' && p.attributes.group === 'AWS-Lambda-Duration') {
        const terms = lambdaData.terms.OnDemand[sku];
        if (!terms) continue;
        const priceDim = Object.values(terms)[0] as any;
        const priceDetails = Object.values(priceDim.priceDimensions)[0] as any;
        const price = parseFloat(priceDetails.pricePerUnit.USD);

        if (p.attributes.usagetype === 'USE1-Lambda-GB-Second') {
          x86Rate = price;
        } else if (p.attributes.usagetype === 'USE1-Lambda-ARM-GB-Second') {
          armRate = price;
        }
      }
    }

    console.log(`[AwsLambdaScraper] Live Rates - x86: $${x86Rate}/GB-sec | ARM: $${armRate}/GB-sec`);

    // Convert GB-second to GB-hour for standardization (1 hour = 3600 seconds)
    const x86HrRate = x86Rate * 3600;
    const armHrRate = armRate * 3600;

    const generateConfigs = (arch: 'x86_64' | 'ARM64', vendor: 'Intel' | 'AWS', rate: number) => {
      const sizesMb = [128, 256, 512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192, 9216, 10240];
      return sizesMb.map(mb => {
        const gb = mb / 1024;
        return {
          type: `Lambda-${mb}MB-${arch}`,
          vcpus: gb * 0.5, // Rough approximation of vCPU scaling for Lambda
          memory: gb,
          cpuVendor: vendor,
          price: gb * rate,
        };
      });
    };

    const instances = [
      ...generateConfigs('x86_64', 'Intel', x86HrRate),
      ...generateConfigs('ARM64', 'AWS', armHrRate)
    ];

    return instances;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new AwsLambdaScraper();
  scraper.run().then(res => console.log(res.slice(0, 3))).catch(console.error);
}
