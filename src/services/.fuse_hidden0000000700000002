import type { Sql } from 'postgres';
import { PricingPipeline, type PricingRecord } from './pricing_pipeline';

export class ContainersRegistryPricingPipeline extends PricingPipeline {
  constructor(sql: Sql) {
    super(sql);
  }

  private getGeography(region: string): string {
    const r = region.toLowerCase();
    if (r.includes('us-') || r.includes('us') || r.includes('america') || r.includes('canada') || r.includes('centralus') || r.includes('eastus') || r.includes('westus')) return 'N. America';
    if (r.includes('brazil') || r.includes('southamerica') || r.includes('sao') || r.includes('chile')) return 'S. America';
    if (r.includes('europe') || r.includes('uk-') || r.includes('france') || r.includes('germany') || r.includes('westcore') || r.includes('switzerland') || r.includes('northeurope') || r.includes('westeurope')) return 'W. Europe';
    if (r.includes('asia') || r.includes('japan') || r.includes('korea') || r.includes('india') || r.includes('singapore') || r.includes('tokyo') || r.includes('cn-') || r.includes('china') || r.includes('hangzhou')) return 'Asia Pacific';
    if (r.includes('australia')) return 'Australia';
    if (r.includes('me-') || r.includes('africa') || r.includes('uae') || r.includes('dubai')) return 'Mid East & Africa';
    return 'N. America';
  }

  async run(): Promise<{ provider: string; status: string; count?: number; message?: string }[]> {
    const results: { provider: string; status: string; count?: number; message?: string }[] = [];

    // AWS ECR - Elastic Container Registry
    try {
      console.log('🚀 Fetching AWS ECR pricing...');
      const awsEcrPricing = [
        { instance_type: 'ECR Storage', pricing_component: 'Storage (per GB/month)', region: 'us-east-1', price: 0.10 },
        { instance_type: 'ECR Data Transfer Out', pricing_component: 'Data Transfer (per GB)', region: 'us-east-1', price: 0.02 },
        { instance_type: 'ECR API Calls', pricing_component: 'API Operations', region: 'us-east-1', price: 0.0000005 },
      ];

      const records: PricingRecord[] = awsEcrPricing.map(p => ({
        provider: 'aws', service: 'registry', region: p.region, instanceType: p.instance_type,
        vcpus: 0, memoryGb: 0, arch: 'N/A', os: 'N/A', cpuVendor: 'N/A', gpuCount: 0,
        geography: this.getGeography(p.region), category: 'registry', price: p.price, unit: 'per unit/month',
        dataSource: 'static_config', attributes: { pricing_component: p.pricing_component }
      }));
      await this.saveRecords(records, 'registry');
      
      console.log('✅ AWS ECR: 3 pricing tiers configured');
      results.push({ provider: 'aws', status: 'success', count: 3 });
    } catch (err) {
      console.error('❌ AWS ECR fetch failed:', err);
      results.push({ provider: 'aws', status: 'error', message: String(err) });
    }

    // Azure ACR - Azure Container Registry
    try {
      console.log('🚀 Fetching Azure ACR pricing...');
      const azureAcrPricing = [
        { instance_type: 'ACR Storage', pricing_component: 'Storage (per GB/month)', region: 'eastus', price: 0.10 },
        { instance_type: 'ACR Data Transfer Out', pricing_component: 'Data Transfer (per GB)', region: 'eastus', price: 0.0871 },
        { instance_type: 'ACR Webhook Calls', pricing_component: 'API Operations', region: 'eastus', price: 0.00001 },
      ];

      const records: PricingRecord[] = azureAcrPricing.map(p => ({
        provider: 'azure', service: 'registry', region: p.region, instanceType: p.instance_type,
        vcpus: 0, memoryGb: 0, arch: 'N/A', os: 'N/A', cpuVendor: 'N/A', gpuCount: 0,
        geography: this.getGeography(p.region), category: 'registry', price: p.price, unit: 'per unit/month',
        dataSource: 'static_config', attributes: { pricing_component: p.pricing_component }
      }));
      await this.saveRecords(records, 'registry');
      console.log('✅ Azure ACR: 3 pricing tiers configured');
      results.push({ provider: 'azure', status: 'success', count: 3 });
    } catch (err) {
      console.error('❌ Azure ACR fetch failed:', err);
      results.push({ provider: 'azure', status: 'error', message: String(err) });
    }

    // Google Artifact Registry / GCR
    try {
      console.log('🚀 Fetching Google Artifact Registry pricing...');
      const gcpRegistryPricing = [
        { instance_type: 'Artifact Registry Storage', pricing_component: 'Storage (per GB/month)', region: 'us-central1', price: 0.10 },
        { instance_type: 'Artifact Registry Data Transfer Out', pricing_component: 'Data Transfer (per GB)', region: 'us-central1', price: 0.12 },
      ];

      const records: PricingRecord[] = gcpRegistryPricing.map(p => ({
        provider: 'gcp', service: 'registry', region: p.region, instanceType: p.instance_type,
        vcpus: 0, memoryGb: 0, arch: 'N/A', os: 'N/A', cpuVendor: 'N/A', gpuCount: 0,
        geography: this.getGeography(p.region), category: 'registry', price: p.price, unit: 'per unit/month',
        dataSource: 'static_config', attributes: { pricing_component: p.pricing_component }
      }));
      await this.saveRecords(records, 'registry');
      console.log('✅ Google Artifact Registry: 2 pricing tiers configured');
      results.push({ provider: 'gcp', status: 'success', count: 2 });
    } catch (err) {
      console.error('❌ Google Artifact Registry fetch failed:', err);
      results.push({ provider: 'gcp', status: 'error', message: String(err) });
    }

    // Oracle Container Registry
    try {
      console.log('🚀 Fetching Oracle Container Registry pricing...');
      const oracleRegistryPricing = [
        { instance_type: 'OCR Storage', pricing_component: 'Storage (per GB/month)', region: 'us-ashburn-1', price: 0.05 },
        { instance_type: 'OCR Data Transfer Out', pricing_component: 'Data Transfer (per GB)', region: 'us-ashburn-1', price: 0.02 },
      ];

      const records: PricingRecord[] = oracleRegistryPricing.map(p => ({
        provider: 'oracle', service: 'registry', region: p.region, instanceType: p.instance_type,
        vcpus: 0, memoryGb: 0, arch: 'N/A', os: 'N/A', cpuVendor: 'N/A', gpuCount: 0,
        geography: this.getGeography(p.region), category: 'registry', price: p.price, unit: 'per unit/month',
        dataSource: 'static_config', attributes: { pricing_component: p.pricing_component }
      }));
      await this.saveRecords(records, 'registry');
      console.log('✅ Oracle Container Registry: 2 pricing tiers configured');
      results.push({ provider: 'oracle', status: 'success', count: 2 });
    } catch (err) {
      console.error('❌ Oracle Container Registry fetch failed:', err);
      results.push({ provider: 'oracle', status: 'error', message: String(err) });
    }

    // DigitalOcean Container Registry
    try {
      console.log('🚀 Fetching DigitalOcean Container Registry pricing...');
      const doRegistryPricing = [
        { instance_type: 'DOCR Standard', pricing_component: 'Storage (per GB/month)', region: 'nyc', price: 5.00, description: 'Flat rate for 250GB' },
        { instance_type: 'DOCR Data Transfer Out', pricing_component: 'Data Transfer (per GB)', region: 'nyc', price: 0.05, description: 'Per GB after 1TB included' },
      ];

      const records: PricingRecord[] = doRegistryPricing.map(p => ({
        provider: 'digitalocean', service: 'registry', region: p.region, instanceType: p.instance_type,
        vcpus: 0, memoryGb: 0, arch: 'N/A', os: 'N/A', cpuVendor: 'N/A', gpuCount: 0,
        geography: this.getGeography(p.region), category: 'registry', price: p.price, unit: 'per unit/month',
        dataSource: 'static_config', attributes: { pricing_component: p.pricing_component, description: p.description }
      }));
      await this.saveRecords(records, 'registry');
      console.log('✅ DigitalOcean Container Registry: 2 pricing tiers configured');
      results.push({ provider: 'digitalocean', status: 'success', count: 2 });
    } catch (err) {
      console.error('❌ DigitalOcean Container Registry fetch failed:', err);
      results.push({ provider: 'digitalocean', status: 'error', message: String(err) });
    }

    // Alibaba Container Registry
    try {
      console.log('🚀 Fetching Alibaba Container Registry pricing...');
      const alibabaRegistryPricing = [
        { instance_type: 'ACR Storage', pricing_component: 'Storage (per GB/month)', region: 'cn-hangzhou', price: 0.003 },
        { instance_type: 'ACR Data Transfer Out', pricing_component: 'Data Transfer (per GB)', region: 'cn-hangzhou', price: 0.50 },
      ];

      const records: PricingRecord[] = alibabaRegistryPricing.map(p => ({
        provider: 'alibaba', service: 'registry', region: p.region, instanceType: p.instance_type,
        vcpus: 0, memoryGb: 0, arch: 'N/A', os: 'N/A', cpuVendor: 'N/A', gpuCount: 0,
        geography: this.getGeography(p.region), category: 'registry', price: p.price, unit: 'per unit/month',
        dataSource: 'static_config', attributes: { pricing_component: p.pricing_component }
      }));
      await this.saveRecords(records, 'registry');
      console.log('✅ Alibaba Container Registry: 2 pricing tiers configured');
      results.push({ provider: 'alibaba', status: 'success', count: 2 });
    } catch (err) {
      console.error('❌ Alibaba Container Registry fetch failed:', err);
      results.push({ provider: 'alibaba', status: 'error', message: String(err) });
    }

    return results;
  }
}
