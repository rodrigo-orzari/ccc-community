import type { Sql } from 'postgres';
import { BaseAdapter, PricingRecord, PricingPipeline } from './pricing_pipeline';
import { 
  AWSContainersLiveAdapter,
  AzureContainersLiveAdapter,
  GCPContainersLiveAdapter,
  DigitalOceanContainersLiveAdapter,
  OracleContainersLiveAdapter
} from './containers_adapters_live';

import { AWS_CONTAINERS, AWS_CONTAINERS_REGION, AWS_CONTAINERS_GEOGRAPHY } from '../config/aws_containers';
import { AZURE_CONTAINERS, AZURE_CONTAINERS_REGION, AZURE_CONTAINERS_GEOGRAPHY } from '../config/azure_containers';
import { GCP_CONTAINERS, GCP_CONTAINERS_REGION, GCP_CONTAINERS_GEOGRAPHY } from '../config/gcp_containers';
import { DIGITALOCEAN_CONTAINERS, DIGITALOCEAN_CONTAINERS_REGION, DIGITALOCEAN_CONTAINERS_GEOGRAPHY } from '../config/digitalocean_containers';
import { ORACLE_CONTAINERS, ORACLE_CONTAINERS_REGION, ORACLE_CONTAINERS_GEOGRAPHY } from '../config/oracle_containers';
import { ALIBABA_CONTAINERS, ALIBABA_CONTAINERS_REGION, ALIBABA_CONTAINERS_GEOGRAPHY } from '../config/alibaba_containers.ts';

export class AWSContainersStaticAdapter extends BaseAdapter {
  providerSlug = 'aws';
  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching AWS Containers pricing (${AWS_CONTAINERS.length} entries from static config)...`);
    return AWS_CONTAINERS.map(inst => ({
      provider: 'aws',
      service: 'Containers',
      region: AWS_CONTAINERS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: AWS_CONTAINERS_GEOGRAPHY,
      category: 'containers',
      price: inst.price,
      unit: 'Hourly',
      dataSource: 'static_config' as const,
      attributes: inst.attributes,
    }));
  }
}

export class AzureContainersStaticAdapter extends BaseAdapter {
  providerSlug = 'azure';
  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Azure Containers pricing (${AZURE_CONTAINERS.length} entries from static config)...`);
    return AZURE_CONTAINERS.map(inst => ({
      provider: 'azure',
      service: 'Containers',
      region: AZURE_CONTAINERS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: AZURE_CONTAINERS_GEOGRAPHY,
      category: 'containers',
      price: inst.price,
      unit: 'Hourly',
      dataSource: 'static_config' as const,
      attributes: inst.attributes,
    }));
  }
}

export class GCPContainersStaticAdapter extends BaseAdapter {
  providerSlug = 'gcp';
  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching GCP Containers pricing (${GCP_CONTAINERS.length} entries from static config)...`);
    return GCP_CONTAINERS.map(inst => ({
      provider: 'gcp',
      service: 'Containers',
      region: GCP_CONTAINERS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: GCP_CONTAINERS_GEOGRAPHY,
      category: 'containers',
      price: inst.price,
      unit: 'Hourly',
      dataSource: 'static_config' as const,
      attributes: inst.attributes,
    }));
  }
}

export class DigitalOceanContainersStaticAdapter extends BaseAdapter {
  providerSlug = 'digitalocean';
  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching DigitalOcean Containers pricing (${DIGITALOCEAN_CONTAINERS.length} entries from static config)...`);
    return DIGITALOCEAN_CONTAINERS.map(inst => ({
      provider: 'digitalocean',
      service: 'Containers',
      region: DIGITALOCEAN_CONTAINERS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: DIGITALOCEAN_CONTAINERS_GEOGRAPHY,
      category: 'containers',
      price: inst.price,
      unit: 'Hourly',
      dataSource: 'static_config' as const,
      attributes: inst.attributes,
    }));
  }
}

export class OracleContainersStaticAdapter extends BaseAdapter {
  providerSlug = 'oracle';
  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Oracle Containers pricing (${ORACLE_CONTAINERS.length} entries from static config)...`);
    return ORACLE_CONTAINERS.map(inst => ({
      provider: 'oracle',
      service: 'Containers',
      region: ORACLE_CONTAINERS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: inst.cpuVendor === 'AWS' ? 'ARM' : 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: ORACLE_CONTAINERS_GEOGRAPHY,
      category: 'containers',
      price: inst.price,
      unit: 'Hourly',
      dataSource: 'static_config' as const,
      attributes: inst.attributes,
    }));
  }
}

export class AlibabaContainersStaticAdapter extends BaseAdapter {
  providerSlug = 'alibaba';
  async fetchPricing(): Promise<PricingRecord[]> {
    console.log(`Fetching Alibaba Containers pricing (${ALIBABA_CONTAINERS.length} entries from static config)...`);
    return ALIBABA_CONTAINERS.map(inst => ({
      provider: 'alibaba',
      service: 'ACK Serverless',
      region: ALIBABA_CONTAINERS_REGION,
      instanceType: inst.type,
      vcpus: inst.vcpus,
      memoryGb: inst.memory,
      arch: 'x86 64',
      os: 'Linux',
      cpuVendor: inst.cpuVendor,
      gpuCount: 0,
      geography: ALIBABA_CONTAINERS_GEOGRAPHY,
      category: 'containers',
      price: inst.price,
      unit: inst.unit,
      dataSource: 'static_config' as const,
      attributes: inst.attributes,
    }));
  }
}

export class ContainersPricingPipeline extends PricingPipeline {
  constructor(sql: Sql) {
    super(sql);
    // Use live API adapters with fallback to static configs
    this.adapters = [
      new AWSContainersLiveAdapter(),
      new AzureContainersLiveAdapter(),
      new GCPContainersLiveAdapter(),
      new DigitalOceanContainersLiveAdapter(),
      new OracleContainersLiveAdapter(),
      new AlibabaContainersStaticAdapter(), // Use static for Alibaba
    ];
  }

  async run() {
    const results = [];
    const providers = [
      { name: 'aws', LiveAdapter: AWSContainersLiveAdapter, StaticAdapter: AWSContainersStaticAdapter },
      { name: 'azure', LiveAdapter: AzureContainersLiveAdapter, StaticAdapter: AzureContainersStaticAdapter },
      { name: 'gcp', LiveAdapter: GCPContainersLiveAdapter, StaticAdapter: GCPContainersStaticAdapter },
      { name: 'digitalocean', LiveAdapter: DigitalOceanContainersLiveAdapter, StaticAdapter: DigitalOceanContainersStaticAdapter },
      { name: 'oracle', LiveAdapter: OracleContainersLiveAdapter, StaticAdapter: OracleContainersStaticAdapter },
      { name: 'alibaba', LiveAdapter: AlibabaContainersStaticAdapter, StaticAdapter: AlibabaContainersStaticAdapter },
    ];

    for (const provider of providers) {
      try {
        console.log(`🔄 Attempting ${provider.name.toUpperCase()} Containers live API fetch...`);
        const liveAdapter = new provider.LiveAdapter();
        let records = await liveAdapter.fetchPricing();

        if (records.length === 0) {
          console.warn(`⚠️  ${provider.name.toUpperCase()} Containers live API returned empty, using static config fallback`);
          const staticAdapter = new provider.StaticAdapter();
          records = await staticAdapter.fetchPricing();
        }

        await this.saveRecords(records, 'containers');
        results.push({
          provider: provider.name,
          service: 'Containers',
          status: 'success',
          count: records.length,
          dataSource: records[0]?.dataSource || 'static_config'
        });
      } catch (error: any) {
        console.warn(`⚠️  ${provider.name.toUpperCase()} Containers live API failed (${error.message}), falling back to static config...`);
        try {
          const staticAdapter = new provider.StaticAdapter();
          const records = await staticAdapter.fetchPricing();
          await this.saveRecords(records, 'containers');
          results.push({
            provider: provider.name,
            service: 'Containers',
            status: 'success',
            count: records.length,
            dataSource: 'static_config',
            note: 'Using static config fallback due to API failure'
          });
        } catch (fallbackError: any) {
          console.error(`❌ ${provider.name.toUpperCase()} Containers static config also failed:`, fallbackError);
          results.push({
            provider: provider.name,
            service: 'Containers',
            status: 'error',
            message: `Live API failed: ${error.message}, Static fallback failed: ${(fallbackError as Error).message}`
          });
        }
      }
    }

    return results;
  }
}
