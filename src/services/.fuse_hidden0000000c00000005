import type { Sql } from 'postgres';
import { BaseAdapter, PricingRecord, PricingPipeline } from './pricing_pipeline';
import { AWSLambdaLiveAdapter, GCPCloudRunLiveAdapter, AzureFunctionsLiveAdapter } from './serverless_adapters_live';
import {
  AWS_SERVERLESS,
  AWS_SERVERLESS_REGION,
  AWS_SERVERLESS_GEOGRAPHY,
} from '../config/aws_serverless';
import {
  GCP_SERVERLESS,
  GCP_SERVERLESS_REGION,
  GCP_SERVERLESS_GEOGRAPHY,
} from '../config/gcp_serverless';
import {
  AZURE_SERVERLESS,
  AZURE_SERVERLESS_REGION,
  AZURE_SERVERLESS_GEOGRAPHY,
} from '../config/azure_serverless';
import {
  DIGITALOCEAN_SERVERLESS,
  DIGITALOCEAN_SERVERLESS_REGION,
  DIGITALOCEAN_SERVERLESS_GEOGRAPHY,
} from '../config/digitalocean_serverless';
import {
  ORACLE_SERVERLESS,
  ORACLE_SERVERLESS_REGION,
  ORACLE_SERVERLESS_GEOGRAPHY,
} from '../config/oracle_serverless';
import {
  ALIBABA_SERVERLESS,
  ALIBABA_SERVERLESS_REGION,
  ALIBABA_SERVERLESS_GEOGRAPHY,
} from '../config/alibaba_serverless.ts';
import { AwsLambdaScraper } from '../scrapers/aws_lambda';

export class AWSServerlessLiveAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`🔄 Attempting AWS Serverless live API fetch (via AwsLambdaScraper)...`);
    try {
      const scraper = new AwsLambdaScraper();
      const instances = await scraper.run();
      
      return instances.map(inst => ({
        provider: 'aws',
        service: 'Lambda',
        region: AWS_SERVERLESS_REGION,
        instanceType: inst.type,
        vcpus: inst.vcpus,
        memoryGb: inst.memory,
        arch: inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
        os: 'Linux',
        cpuVendor: inst.cpuVendor,
        gpuCount: 0,
        geography: AWS_SERVERLESS_GEOGRAPHY,
        category: 'Serverless Compute',
        price: inst.price,
        unit: 'Hour',
        dataSource: 'live_api' as const,
        supportedLanguages: [],
        attributes: {},
      }));
    } catch (e) {
      console.warn(`⚠️  AWS Serverless live fetch failed: ${e}. Falling back to empty to trigger static config...`);
      return [];
    }
  }
}

export class AWSServerlessAdapter extends BaseAdapter {
  providerSlug = 'aws';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching AWS Lambda pricing (${AWS_SERVERLESS.length} entries from static config)...`);
    return AWS_SERVERLESS.map(inst => ({
      provider: 'aws',
      service: 'Lambda',
      region: AWS_SERVERLESS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: AWS_SERVERLESS_GEOGRAPHY,
      category: 'Serverless Compute',
      price: inst.price,
      unit: 'GB-Hour',
      dataSource: 'static_config' as const,
      supportedLanguages: inst.supportedLanguages || [],
      attributes: inst.attributes || {},
    }));
  }
}

export class GCPServerlessAdapter extends BaseAdapter {
  providerSlug = 'gcp';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching GCP Serverless pricing (${GCP_SERVERLESS.length} entries from static config)...`);
    return GCP_SERVERLESS.map(inst => ({
      provider: 'gcp',
      service: 'Cloud Run',
      region: GCP_SERVERLESS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: GCP_SERVERLESS_GEOGRAPHY,
      category: 'Serverless Compute',
      price: inst.price,
      unit: 'GB-Hour',
      dataSource: 'static_config' as const,
      supportedLanguages: inst.supportedLanguages,
      attributes: inst.attributes, // Use attributes from config with all dimensions
    }));
  }
}

export class AzureServerlessAdapter extends BaseAdapter {
  providerSlug = 'azure';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Azure Functions pricing (${AZURE_SERVERLESS.length} entries from static config)...`);
    return AZURE_SERVERLESS.map(inst => ({
      provider: 'azure',
      service: (inst as any).serviceOverride || 'Azure Functions',
      region: AZURE_SERVERLESS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: AZURE_SERVERLESS_GEOGRAPHY,
      category: 'Serverless Compute',
      price: inst.price,
      unit: 'GB-Hour',
      dataSource: 'static_config' as const,
      supportedLanguages: inst.supportedLanguages || [],
      attributes: inst.attributes || {},
    }));
  }
}

export class DigitalOceanServerlessAdapter extends BaseAdapter {
  providerSlug = 'digitalocean';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching DigitalOcean Serverless pricing (${DIGITALOCEAN_SERVERLESS.length} entries from static config)...`);
    return DIGITALOCEAN_SERVERLESS.map(inst => ({
      provider: 'digitalocean',
      service: 'App Platform Functions',
      region: DIGITALOCEAN_SERVERLESS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: DIGITALOCEAN_SERVERLESS_GEOGRAPHY,
      category: 'Serverless Compute',
      price: inst.price,
      unit: 'GB-Hour',
      dataSource: 'static_config' as const,
      supportedLanguages: inst.supportedLanguages,
      attributes: inst.attributes, // Use attributes from config with all dimensions
    }));
  }
}

// Not wired to the live OCI price list (oracle_price_list.ts): the feed's
// "Oracle Functions - Execution Time" and "- Invocations" line items both
// report a PAY_AS_YOU_GO value of $0, which looks like a free-tier/promo
// artifact rather than the real metered rate — writing that would silently
// make Oracle Functions look free in the comparison table, which is worse
// than the (accurate, documented) static rate. Revisit if Oracle's feed
// starts returning a non-zero value for these SKUs.
export class OracleServerlessAdapter extends BaseAdapter {
  providerSlug = 'oracle';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Oracle Serverless pricing (${ORACLE_SERVERLESS.length} entries from static config)...`);
    return ORACLE_SERVERLESS.map(inst => ({
      provider: 'oracle',
      service: 'OCI Functions',
      region: ORACLE_SERVERLESS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: ORACLE_SERVERLESS_GEOGRAPHY,
      category: 'Serverless Compute',
      price: inst.price,
      unit: 'GB-Hour',
      dataSource: 'static_config' as const,
      supportedLanguages: inst.supportedLanguages,
      attributes: inst.attributes, // Use attributes from config with all dimensions
    }));
  }
}

export class AlibabaServerlessAdapter extends BaseAdapter {
  providerSlug = 'alibaba';

  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Alibaba Serverless pricing (${ALIBABA_SERVERLESS.length} entries from static config)...`);
    return ALIBABA_SERVERLESS.map(inst => ({
      provider: 'alibaba',
      service: 'Function Compute',
      region: ALIBABA_SERVERLESS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: ALIBABA_SERVERLESS_GEOGRAPHY,
      category: 'Serverless Compute',
      price: inst.price,
      unit: inst.unit,
      dataSource: 'static_config' as const,
      supportedLanguages: inst.supportedLanguages,
      attributes: inst.attributes,
    }));
  }
}

export class ServerlessPricingPipeline extends PricingPipeline {
  constructor(sql: Sql) {
    super(sql);
    // Live API adapters, each with per-record fallback to static config:
    //   AWS Lambda        — live (AWS Price List API)
    //   GCP Cloud Run     — live (Billing Catalog API, needs GCP_BILLING_API_KEY)
    //   Azure Functions   — live (Retail Prices API)
    //   DigitalOcean      — static config
    //   Alibaba           — static config
    this.adapters = [
      new AWSLambdaLiveAdapter(),
      new GCPCloudRunLiveAdapter(),
      new AzureFunctionsLiveAdapter(),
      new DigitalOceanServerlessAdapter(),
      new AlibabaServerlessAdapter(),
    ];
  }

  async run() {
    const results = [];

    // AWS Lambda: Try live API first, fall back to static config
    try {
      console.log('🔄 Attempting AWS Lambda live API fetch...');
      const awsAdapter = new AWSLambdaLiveAdapter();
      let records = await awsAdapter.fetchPricing();

      if (records.length === 0) {
        console.warn('⚠️  AWS Lambda live API returned empty, using static config fallback');
        records = await this.getAWSServerlessStaticRecords();
      }

      await this.saveRecords(records, 'serverless');
      results.push({
        provider: 'aws',
        service: 'Lambda',
        status: 'success',
        count: records.length,
        dataSource: records[0]?.dataSource || 'static_config'
      });
    } catch (error: any) {
      console.warn(`⚠️  AWS Lambda live API failed (${error.message}), falling back to static config...`);
      try {
        const records = await this.getAWSServerlessStaticRecords();
        await this.saveRecords(records, 'serverless');
        results.push({
          provider: 'aws',
          service: 'Lambda',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: 'Using static config fallback due to API failure'
        });
      } catch (fallbackError: any) {
        console.error(`❌ AWS Lambda static config also failed:`, fallbackError);
        results.push({
          provider: 'aws',
          service: 'Lambda',
          status: 'error',
          message: `Live API failed: ${error.message}, Static fallback failed: ${(fallbackError as Error).message}`
        });
      }
    }

    // GCP Cloud Run: Try live Billing Catalog API first (needs GCP_BILLING_API_KEY),
    // fall back to static config.
    try {
      console.log('🔄 Attempting GCP Cloud Run live API fetch...');
      const gcpAdapter = new GCPCloudRunLiveAdapter();
      let records = await gcpAdapter.fetchPricing();

      if (records.length === 0) {
        console.warn('⚠️  GCP Cloud Run live API returned empty, using static config fallback');
        records = await this.getGCPServerlessStaticRecords();
      }

      await this.saveRecords(records, 'serverless');
      results.push({
        provider: 'gcp',
        service: 'Cloud Run',
        status: 'success',
        count: records.length,
        dataSource: records[0]?.dataSource || 'static_config'
      });
    } catch (error: any) {
      console.warn(`⚠️  GCP Cloud Run live API failed (${error.message}), falling back to static config...`);
      try {
        const records = await this.getGCPServerlessStaticRecords();
        await this.saveRecords(records, 'serverless');
        results.push({
          provider: 'gcp',
          service: 'Cloud Run',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: 'Using static config fallback due to API failure'
        });
      } catch (fallbackError: any) {
        console.error(`❌ GCP Cloud Run static config also failed:`, fallbackError);
        results.push({
          provider: 'gcp',
          service: 'Cloud Run',
          status: 'error',
          message: `Live API failed: ${error.message}, Static fallback failed: ${(fallbackError as Error).message}`
        });
      }
    }

    // Azure Functions: Try live Retail Prices API first, fall back to static config.
    // Container Apps rows (same static config array, no live adapter) are always
    // appended so a successful live fetch doesn't drop them from the table.
    try {
      console.log('🔄 Attempting Azure Functions live API fetch...');
      const azureAdapter = new AzureFunctionsLiveAdapter();
      let records = await azureAdapter.fetchPricing();

      if (records.length === 0) {
        console.warn('⚠️  Azure Functions live API returned empty, using static config fallback');
        records = await this.getAzureServerlessStaticRecords();
      } else {
        records = [...records, ...(await this.getAzureContainerAppsStaticRecords())];
      }

      await this.saveRecords(records, 'serverless');
      results.push({
        provider: 'azure',
        service: 'Azure Functions',
        status: 'success',
        count: records.length,
        dataSource: records[0]?.dataSource || 'static_config'
      });
    } catch (error: any) {
      console.warn(`⚠️  Azure Functions live API failed (${error.message}), falling back to static config...`);
      try {
        const records = await this.getAzureServerlessStaticRecords();
        await this.saveRecords(records, 'serverless');
        results.push({
          provider: 'azure',
          service: 'Azure Functions',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: 'Using static config fallback due to API failure'
        });
      } catch (fallbackError: any) {
        console.error(`❌ Azure Functions static config also failed:`, fallbackError);
        results.push({
          provider: 'azure',
          service: 'Azure Functions',
          status: 'error',
          message: `Live API failed: ${error.message}, Static fallback failed: ${(fallbackError as Error).message}`
        });
      }
    }

    // DigitalOcean App Platform Functions
    try {
      console.log('⏳ DigitalOcean App Platform Functions...');
      const records = await this.getDigitalOceanServerlessStaticRecords();
      if (records.length > 0) {
        await this.saveRecords(records, 'serverless');
        results.push({
          provider: 'digitalocean',
          service: 'App Platform Functions',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: 'DigitalOcean App Platform Functions - static config'
        });
      }
    } catch (error: any) {
      console.warn(`⚠️  DigitalOcean Functions error:`, error.message);
      results.push({
        provider: 'digitalocean',
        service: 'App Platform Functions',
        status: 'skipped',
        message: error.message
      });
    }

    // Oracle OCI Functions
    try {
      console.log('⏳ Oracle OCI Functions...');
      const records = await this.getOracleServerlessStaticRecords();
      if (records.length > 0) {
        await this.saveRecords(records, 'serverless');
        results.push({
          provider: 'oracle',
          service: 'OCI Functions',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: 'Oracle OCI Functions - static config'
        });
      }
    } catch (error: any) {
      console.warn(`⚠️  Oracle OCI Functions error:`, error.message);
      results.push({
        provider: 'oracle',
        service: 'OCI Functions',
        status: 'skipped',
        message: error.message
      });
    }

    // Alibaba Function Compute
    try {
      console.log('⏳ Alibaba Function Compute...');
      const adapter = new AlibabaServerlessAdapter();
      const records = await adapter.fetchPricing();
      if (records.length > 0) {
        await this.saveRecords(records, 'serverless');
        results.push({
          provider: 'alibaba',
          service: 'Function Compute',
          status: 'success',
          count: records.length,
          dataSource: 'static_config',
          note: 'Alibaba Function Compute - static config'
        });
      }
    } catch (error: any) {
      console.warn(`⚠️  Alibaba Function Compute error:`, error.message);
      results.push({
        provider: 'alibaba',
        service: 'Function Compute',
        status: 'skipped',
        message: error.message
      });
    }

    return results;
  }

  /**
   * Static config fallback for AWS Lambda (Phase 1 fallback)
   */
  private async getAWSServerlessStaticRecords(): Promise<PricingRecord[]> {
    const adapter = new AWSServerlessAdapter();
    return adapter.fetchPricing();
  }

  /**
   * Static-config fallback for GCP Cloud Run (used when the live Billing
   * Catalog fetch is unavailable — see GCPCloudRunLiveAdapter).
   */
  private async getGCPServerlessStaticRecords(): Promise<PricingRecord[]> {
    const adapter = new GCPServerlessAdapter();
    return adapter.fetchPricing();
  }

  /**
   * Static config for Azure Functions (used when the live Retail Prices fetch fails)
   */
  private async getAzureServerlessStaticRecords(): Promise<PricingRecord[]> {
    const adapter = new AzureServerlessAdapter();
    return adapter.fetchPricing();
  }

  /**
   * Azure Container Apps rows live in the same AZURE_SERVERLESS static array as
   * Functions but have no live adapter of their own — AzureFunctionsLiveAdapter
   * only covers Functions, so we always append these statically regardless of
   * whether the Functions fetch above went live or fell back, otherwise a
   * successful live Functions fetch would silently drop Container Apps from
   * the comparison table.
   */
  private async getAzureContainerAppsStaticRecords(): Promise<PricingRecord[]> {
    const allStatic = await this.getAzureServerlessStaticRecords();
    return allStatic.filter(r => r.service === 'Container Apps');
  }

  /**
   * Static config for DigitalOcean App Platform Functions
   */
  private async getDigitalOceanServerlessStaticRecords(): Promise<PricingRecord[]> {
    const adapter = new DigitalOceanServerlessAdapter();
    return adapter.fetchPricing();
  }

  /**
   * Static config for Oracle OCI Functions
   */
  private async getOracleServerlessStaticRecords(): Promise<PricingRecord[]> {
    const adapter = new OracleServerlessAdapter();
    return adapter.fetchPricing();
  }
}
