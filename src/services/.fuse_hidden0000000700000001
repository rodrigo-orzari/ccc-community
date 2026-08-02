import { PricingRecord, PricingPipeline } from './pricing_pipeline';
import axios from 'axios';

import { AWS_STORAGE, AWS_STORAGE_REGION, AWS_STORAGE_GEOGRAPHY } from '../config/aws_storage';
import { AZURE_STORAGE, AZURE_STORAGE_REGION, AZURE_STORAGE_GEOGRAPHY } from '../config/azure_storage';
import { GCP_STORAGE, GCP_STORAGE_REGION, GCP_STORAGE_GEOGRAPHY } from '../config/gcp_storage';
import { ORACLE_STORAGE, ORACLE_STORAGE_REGION, ORACLE_STORAGE_GEOGRAPHY } from '../config/oracle_storage';
import { DIGITALOCEAN_STORAGE, DIGITALOCEAN_STORAGE_REGION, DIGITALOCEAN_STORAGE_GEOGRAPHY } from '../config/digitalocean_storage';
import { ALIBABA_STORAGE, ALIBABA_STORAGE_REGION, ALIBABA_STORAGE_GEOGRAPHY } from '../config/alibaba_storage';
import { fetchOracleCatalog, findPrice, nameIncludes } from './oracle_price_list';

interface StorageConfigEntry {
  type: string;
  price: number;
  unit: string;
  attributes: Record<string, any>;
  category?: string;
}

function mapStaticRows(rows: StorageConfigEntry[], slug: string, region: string, geography: string, liveTypes: Set<string> = new Set()): PricingRecord[] {
  return rows.map(inst => ({
    provider: slug,
    service: 'Storage',
    region,
    instanceType: inst.type,
    vcpus: 0,
    memoryGb: 0,
    arch: '',
    os: '',
    cpuVendor: '',
    gpuCount: 0,
    geography,
    category: inst.category || inst.attributes?.storage_type || 'Storage',
    price: inst.price,
    unit: inst.unit,
    dataSource: (liveTypes.has(inst.type) ? 'live_api' : 'static_config') as PricingRecord['dataSource'],
    attributes: inst.attributes || {},
  }));
}

// Oracle's OCI price list (oracle_price_list.ts) has clean, unambiguous exact
// matches for exactly two of the seven static storage rows — Block Volume
// Balanced and File Storage. Object Storage/Archive/Infrequent Access appear
// in the feed with a $0 PAY_AS_YOU_GO value (looks like the Always-Free-tier
// line item, not the paid SKU) so findPrice() rejects them and those rows
// keep their static price. This recomputes only the two rows we can trust.
async function getOracleStorageRows(): Promise<{ rows: StorageConfigEntry[]; liveTypes: Set<string> }> {
  const liveTypes = new Set<string>();
  try {
    const catalog = await fetchOracleCatalog();
    const blockRate = findPrice(catalog, item => item.displayName.toLowerCase() === 'storage - block volume - storage');
    const fileRate = findPrice(catalog, item => item.displayName.toLowerCase() === 'file storage - storage');

    const rows = ORACLE_STORAGE.map(row => {
      if (row.type === 'Block Volume Balanced' && blockRate != null) {
        liveTypes.add(row.type);
        return { ...row, price: blockRate };
      }
      if (row.type === 'File Storage' && fileRate != null) {
        liveTypes.add(row.type);
        return { ...row, price: fileRate };
      }
      return row;
    });
    console.log(`✅ Oracle storage: ${liveTypes.size}/${rows.length} rows priced from live OCI rates.`);
    return { rows, liveTypes };
  } catch (err: any) {
    console.warn(`⚠️  OCI live price list fetch failed for storage (${err.message}), using static config.`);
    return { rows: ORACLE_STORAGE, liveTypes };
  }
}

async function getAwsStorageRows(): Promise<{ rows: StorageConfigEntry[]; liveTypes: Set<string> }> {
  const liveTypes = new Set<string>();
  try {
    const s3Url = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/index.json';
    const efsUrl = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEFS/current/index.json';

    const [{ data: s3Data }, { data: efsData }] = await Promise.all([
      axios.get(s3Url),
      axios.get(efsUrl)
    ]);

    const s3Prices = new Map<string, number>();
    for (const sku in s3Data.products) {
      const p = s3Data.products[sku];
      if (p.attributes.location === 'US East (N. Virginia)' && p.productFamily === 'Storage') {
        const terms = s3Data.terms.OnDemand[sku];
        if (!terms) continue;
        const priceDim = Object.values(terms)[0] as any;
        const priceDetails = Object.values(priceDim.priceDimensions)[0] as any;
        const price = parseFloat(priceDetails.pricePerUnit.USD);
        const unit = priceDetails.unit?.toLowerCase();
        if (price === 0 || !unit?.includes('gb-mo')) continue;

        const storageClass = p.attributes.storageClass;
        if (storageClass) {
          s3Prices.set(storageClass, price);
        }
      }
    }

    const efsPrices = new Map<string, number>();
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

        const storageClass = p.attributes.storageClass;
        if (storageClass) {
          efsPrices.set(storageClass, price);
        }
      }
    }

    const rows = AWS_STORAGE.map(row => {
      let livePrice: number | undefined;
      if (row.type === 'S3 Standard') {
        livePrice = s3Prices.get('General Purpose');
      } else if (row.type === 'S3 Standard-IA') {
        livePrice = s3Prices.get('Standard Infrequent Access');
      } else if (row.type === 'S3 One Zone-IA') {
        livePrice = s3Prices.get('One Zone Infrequent Access');
      } else if (row.type === 'S3 Glacier Flexible') {
        livePrice = s3Prices.get('Amazon Glacier');
      } else if (row.type === 'S3 Glacier Deep Archive') {
        livePrice = s3Prices.get('Glacier Deep Archive');
      } else if (row.type === 'EFS Standard') {
        livePrice = efsPrices.get('Standard');
      } else if (row.type === 'EFS Infrequent Access') {
        livePrice = efsPrices.get('Infrequent Access');
      }

      if (livePrice !== undefined && !isNaN(livePrice) && livePrice > 0) {
        liveTypes.add(row.type);
        return { ...row, price: livePrice };
      }
      return row;
    });

    console.log(`✅ AWS storage: ${liveTypes.size}/${rows.length} rows priced from live AWS S3/EFS rates.`);
    return { rows, liveTypes };
  } catch (err: any) {
    console.warn(`⚠️  AWS live storage pricing fetch failed (${err.message}), using static config.`);
    return { rows: AWS_STORAGE, liveTypes };
  }
}

async function getAzureStorageRows(): Promise<{ rows: StorageConfigEntry[]; liveTypes: Set<string> }> {
  const liveTypes = new Set<string>();
  try {
    const url = "https://prices.azure.com/api/retail/prices?$filter=serviceFamily eq 'Storage' and armRegionName eq 'eastus'";
    let items: any[] = [];
    let currentUrl: string | null = url;
    let pages = 0;
    while (currentUrl && pages < 5) {
      const response = await axios.get(currentUrl);
      items = items.concat(response.data.Items);
      currentUrl = response.data.NextPageLink || null;
      pages++;
    }

    const rows = AZURE_STORAGE.map(row => {
      let matchedItem: any = null;
      if (row.type === 'Blob Hot (LRS)') {
        matchedItem = items.find(item => item.meterName === 'Hot LRS Data Stored' && item.productName.toLowerCase().includes('blob'));
      } else if (row.type === 'Blob Hot (ZRS)') {
        matchedItem = items.find(item => item.meterName === 'Hot ZRS Data Stored' && item.productName.toLowerCase().includes('blob'));
      } else if (row.type === 'Blob Hot (GRS)') {
        matchedItem = items.find(item => item.meterName === 'Hot GRS Data Stored' && item.productName.toLowerCase().includes('blob'));
      } else if (row.type === 'Blob Cool (LRS)') {
        matchedItem = items.find(item => item.meterName === 'Cool LRS Data Stored' && item.productName.toLowerCase().includes('blob'));
      } else if (row.type === 'Blob Archive (LRS)') {
        matchedItem = items.find(item => item.meterName === 'Archive LRS Data Stored' && item.productName.toLowerCase().includes('blob'));
      } else if (row.type === 'Azure Files (Transaction Optimized)') {
        matchedItem = items.find(item => item.meterName === 'LRS Data Stored' && item.productName === 'Files');
      } else if (row.type === 'Azure Files Premium') {
        matchedItem = items.find(item => item.meterName.includes('ZRS Data Stored') && item.productName === 'Files v2');
      }

      if (matchedItem && matchedItem.retailPrice > 0) {
        liveTypes.add(row.type);
        return { ...row, price: matchedItem.retailPrice };
      }
      return row;
    });

    console.log(`✅ Azure storage: ${liveTypes.size}/${rows.length} rows priced from live Azure Retail Prices API.`);
    return { rows, liveTypes };
  } catch (err: any) {
    console.warn(`⚠️  Azure live storage pricing fetch failed (${err.message}), using static config.`);
    return { rows: AZURE_STORAGE, liveTypes };
  }
}

const STATIC_PROVIDERS = [
  { slug: 'gcp', rows: GCP_STORAGE, region: GCP_STORAGE_REGION, geography: GCP_STORAGE_GEOGRAPHY },
  { slug: 'digitalocean', rows: DIGITALOCEAN_STORAGE, region: DIGITALOCEAN_STORAGE_REGION, geography: DIGITALOCEAN_STORAGE_GEOGRAPHY },
  { slug: 'alibaba', rows: ALIBABA_STORAGE, region: ALIBABA_STORAGE_REGION, geography: ALIBABA_STORAGE_GEOGRAPHY },
];

export class StoragePricingPipeline extends PricingPipeline {
  async run() {
    const results: any[] = [];

    // AWS live storage overlay
    console.log(`⏳ Storage: aws (${AWS_STORAGE.length} entries, live-recompute attempted)...`);
    try {
      const { rows, liveTypes } = await getAwsStorageRows();
      const records = mapStaticRows(rows, 'aws', AWS_STORAGE_REGION, AWS_STORAGE_GEOGRAPHY, liveTypes);
      await this.saveRecords(records, 'storage');
      results.push({
        provider: 'aws',
        service: 'Storage',
        status: 'success',
        count: records.length,
        dataSource: liveTypes.size > 0 ? (liveTypes.size === records.length ? 'live_api' : 'mixed') : 'static_config',
        note: `aws Storage - ${liveTypes.size}/${records.length} live`,
      });
    } catch (error: any) {
      console.warn('⚠️  Storage aws error:', error.message);
      results.push({ provider: 'aws', service: 'Storage', status: 'error', message: error.message });
    }

    // Azure live storage overlay
    console.log(`⏳ Storage: azure (${AZURE_STORAGE.length} entries, live-recompute attempted)...`);
    try {
      const { rows, liveTypes } = await getAzureStorageRows();
      const records = mapStaticRows(rows, 'azure', AZURE_STORAGE_REGION, AZURE_STORAGE_GEOGRAPHY, liveTypes);
      await this.saveRecords(records, 'storage');
      results.push({
        provider: 'azure',
        service: 'Storage',
        status: 'success',
        count: records.length,
        dataSource: liveTypes.size > 0 ? (liveTypes.size === records.length ? 'live_api' : 'mixed') : 'static_config',
        note: `azure Storage - ${liveTypes.size}/${records.length} live`,
      });
    } catch (error: any) {
      console.warn('⚠️  Storage azure error:', error.message);
      results.push({ provider: 'azure', service: 'Storage', status: 'error', message: error.message });
    }

    for (const p of STATIC_PROVIDERS) {
      console.log(`⏳ Storage: ${p.slug} (${p.rows.length} entries from static config)...`);
      try {
        const records = mapStaticRows(p.rows, p.slug, p.region, p.geography);
        await this.saveRecords(records, 'storage');
        results.push({
          provider: p.slug,
          service: 'Storage',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: `${p.slug} Storage - static config`,
        });
      } catch (error: any) {
        console.warn(`⚠️  Storage ${p.slug} static error:`, error.message);
        results.push({ provider: p.slug, service: 'Storage', status: 'error', message: error.message });
      }
    }

    console.log(`⏳ Storage: oracle (${ORACLE_STORAGE.length} entries, live-recompute attempted)...`);
    try {
      const { rows, liveTypes } = await getOracleStorageRows();
      const records = mapStaticRows(rows, 'oracle', ORACLE_STORAGE_REGION, ORACLE_STORAGE_GEOGRAPHY, liveTypes);
      await this.saveRecords(records, 'storage');
      results.push({
        provider: 'oracle',
        service: 'Storage',
        status: 'success',
        count: records.length,
        dataSource: liveTypes.size > 0 ? 'mixed' : 'static_config',
        note: `oracle Storage - ${liveTypes.size}/${records.length} live`,
      });
    } catch (error: any) {
      console.warn('⚠️  Storage oracle error:', error.message);
      results.push({ provider: 'oracle', service: 'Storage', status: 'error', message: error.message });
    }

    return results;
  }
}
