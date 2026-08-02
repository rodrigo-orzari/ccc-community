import axios from 'axios';
import { PricingRecord, PricingPipeline } from './pricing_pipeline';
import {
  AWS_INTEGRATION,
  AZURE_INTEGRATION,
  GCP_INTEGRATION,
  ORACLE_INTEGRATION,
  ALIBABA_INTEGRATION,
  DIGITALOCEAN_INTEGRATION,
} from '../config/integration';

import { AWS_SERVERLESS_REGION, AWS_SERVERLESS_GEOGRAPHY } from '../config/aws_serverless';
import { GCP_SERVERLESS_REGION, GCP_SERVERLESS_GEOGRAPHY } from '../config/gcp_serverless';
import { AZURE_SERVERLESS_REGION, AZURE_SERVERLESS_GEOGRAPHY } from '../config/azure_serverless';
import { DIGITALOCEAN_SERVERLESS_REGION, DIGITALOCEAN_SERVERLESS_GEOGRAPHY } from '../config/digitalocean_serverless';
import { ORACLE_SERVERLESS_REGION, ORACLE_SERVERLESS_GEOGRAPHY } from '../config/oracle_serverless';
import { ALIBABA_SERVERLESS_REGION, ALIBABA_SERVERLESS_GEOGRAPHY } from '../config/alibaba_serverless.ts';

const STATIC_PROVIDERS: { slug: string; rows: any[]; region: string; geography: string }[] = [
  { slug: 'aws',          rows: AWS_INTEGRATION,          region: AWS_SERVERLESS_REGION,          geography: AWS_SERVERLESS_GEOGRAPHY },
  { slug: 'azure',        rows: AZURE_INTEGRATION,        region: AZURE_SERVERLESS_REGION,        geography: AZURE_SERVERLESS_GEOGRAPHY },
  { slug: 'gcp',          rows: GCP_INTEGRATION,          region: GCP_SERVERLESS_REGION,          geography: GCP_SERVERLESS_GEOGRAPHY },
  { slug: 'oracle',       rows: ORACLE_INTEGRATION,       region: ORACLE_SERVERLESS_REGION,       geography: ORACLE_SERVERLESS_GEOGRAPHY },
  { slug: 'alibaba',      rows: ALIBABA_INTEGRATION,      region: ALIBABA_SERVERLESS_REGION,      geography: ALIBABA_SERVERLESS_GEOGRAPHY },
  { slug: 'digitalocean', rows: DIGITALOCEAN_INTEGRATION, region: DIGITALOCEAN_SERVERLESS_REGION, geography: DIGITALOCEAN_SERVERLESS_GEOGRAPHY },
];

export class IntegrationPricingPipeline extends PricingPipeline {
  // Returns the live retail price for each meter, or null for a meter we could
  // NOT find in the API response. Never substitutes a hardcoded default — a null
  // here means the caller keeps the static config value (and labels it static),
  // so we never present a fallback number as if it were a live fetch.
  private async fetchAzureServiceBusLive(region: string): Promise<{ standardOpPrice: number | null, premiumHourPrice: number | null } | null> {
    try {
      const filter = encodeURIComponent(
        `serviceName eq 'Service Bus' and armRegionName eq '${region}'`
      );
      const url = `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=${filter}`;
      const res = await axios.get(url, { timeout: 15000 });
      const items = res.data?.Items ?? [];

      const stdOpItem = items.find((i: any) => i.skuName === 'Standard' && i.meterName === 'Standard Messaging Operations' && i.retailPrice > 0);
      const premItem = items.find((i: any) => i.skuName === 'Premium' && i.meterName === 'Premium Messaging Unit');

      if (!stdOpItem && !premItem) return null;
      return {
        standardOpPrice: stdOpItem ? stdOpItem.retailPrice : null,
        premiumHourPrice: premItem ? premItem.retailPrice : null,
      };
    } catch (err: any) {
      console.warn('⚠️ Azure Service Bus live pricing fetch failed:', err.message);
      return null;
    }
  }

  // Returns the live Event Grid operations price, or null if not found — same
  // no-fake-defaults contract as fetchAzureServiceBusLive above.
  private async fetchAzureEventGridLive(region: string): Promise<number | null> {
    try {
      const filter = encodeURIComponent(
        `serviceName eq 'Event Grid' and armRegionName eq '${region}'`
      );
      const url = `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=${filter}`;
      const res = await axios.get(url, { timeout: 15000 });
      const items = res.data?.Items ?? [];

      const opItem = items.find((i: any) => i.skuName === 'Standard' && i.meterName === 'Standard Event Operations' && i.retailPrice > 0);
      return opItem ? opItem.retailPrice : null;
    } catch (err: any) {
      console.warn('⚠️ Azure Event Grid live pricing fetch failed:', err.message);
      return null;
    }
  }

  async run() {
    const results: any[] = [];

    // Attempt live fetches for Azure to replace static values where possible
    let liveSb: { standardOpPrice: number, premiumHourPrice: number } | null = null;
    let liveEg: number | null = null;

    try {
      liveSb = await this.fetchAzureServiceBusLive(AZURE_SERVERLESS_REGION);
      liveEg = await this.fetchAzureEventGridLive(AZURE_SERVERLESS_REGION);
    } catch (e) {
      // ignore, fall back to static
    }

    for (const p of STATIC_PROVIDERS) {
      console.log(`⏳ Integration: ${p.slug} (${p.rows.length} entries)...`);
      try {
        let isLiveFetched = false;
        const records: PricingRecord[] = p.rows.map(inst => {
          let price = inst.price;
          let dataSource: 'live_api' | 'static_config' = 'static_config';

          if (p.slug === 'azure') {
            if (inst.type === 'Service Bus Standard' && liveSb?.standardOpPrice != null) {
              price = liveSb.standardOpPrice;
              dataSource = 'live_api';
              isLiveFetched = true;
            } else if (inst.type === 'Service Bus Premium' && liveSb?.premiumHourPrice != null) {
              price = Math.round(liveSb.premiumHourPrice * 24 * 30);
              dataSource = 'live_api';
              isLiveFetched = true;
            } else if (inst.type === 'Event Grid' && liveEg !== null) {
              price = liveEg;
              dataSource = 'live_api';
              isLiveFetched = true;
            }
          }

          return {
            provider: p.slug,
            service: 'Integration',
            region: p.region,
            instanceType: inst.type,
            vcpus: 0,
            memoryGb: 0,
            arch: '',
            os: '',
            cpuVendor: '',
            gpuCount: 0,
            geography: p.geography,
            category: 'integration',
            price,
            unit: inst.unit,
            dataSource,
            attributes: inst.attributes || {},
          };
        });

        await this.saveRecords(records, 'integration');
        results.push({
          provider: p.slug,
          service: 'Integration',
          status: 'success',
          count: records.length,
          dataSource: isLiveFetched ? 'live_api' : 'static_config',
          note: `${p.slug} Integration - ${isLiveFetched ? 'live API fetch' : 'static config'}`,
        });
      } catch (error: any) {
        console.warn(`⚠️  Integration ${p.slug} error:`, error.message);
        results.push({ provider: p.slug, service: 'Integration', status: 'error', message: error.message });
      }
    }
    return results;
  }
}
