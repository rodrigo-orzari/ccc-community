export const NATIVE_ANALYTICS_AWS_REGION = 'us-east-1';
export const NATIVE_ANALYTICS_GCP_REGION = 'us-central1';

export interface NativeAnalyticsConfig {
  provider: 'aws' | 'gcp' | 'azure' | 'oracle' | 'alibaba';
  engine: string;
  tier: string;
  deploymentType: 'Provisioned' | 'Serverless';
  computeUnitName: string;
  pricePerNormalizedUnit: number;
}

export const NATIVE_ANALYTICS_INSTANCES: NativeAnalyticsConfig[] = [
  // AWS Redshift (Serverless - RPUs)
  // Normalization: 1 RPU = 1 Compute Unit
  { provider: 'aws', engine: 'Redshift', tier: 'Standard', deploymentType: 'Serverless', computeUnitName: 'RPU', pricePerNormalizedUnit: 0.36 },
  
  // AWS Redshift (Provisioned - Node Equivalent)
  // RA3 4xlarge is ~$3.26/hr, we map 1 Compute Unit to 1 Node for simplicity here.
  { provider: 'aws', engine: 'Redshift', tier: 'RA3 Node', deploymentType: 'Provisioned', computeUnitName: 'Node', pricePerNormalizedUnit: 3.26 },
  { provider: 'aws', engine: 'Redshift', tier: 'DC2 Node', deploymentType: 'Provisioned', computeUnitName: 'Node', pricePerNormalizedUnit: 0.25 },

  // GCP BigQuery (Capacity Pricing)
  // Normalization: 1 Compute Unit = 100 Slots
  // Standard Edition: ~$0.04 / slot / hr -> $4.00 / 100 slots
  // Enterprise Edition: ~$0.06 / slot / hr -> $6.00 / 100 slots
  // Enterprise Plus: ~$0.10 / slot / hr -> $10.00 / 100 slots
  { provider: 'gcp', engine: 'BigQuery', tier: 'Standard Edition', deploymentType: 'Provisioned', computeUnitName: '100 Slots', pricePerNormalizedUnit: 4.00 },
  { provider: 'gcp', engine: 'BigQuery', tier: 'Enterprise Edition', deploymentType: 'Provisioned', computeUnitName: '100 Slots', pricePerNormalizedUnit: 6.00 },
  { provider: 'gcp', engine: 'BigQuery', tier: 'Enterprise Plus', deploymentType: 'Provisioned', computeUnitName: '100 Slots', pricePerNormalizedUnit: 10.00 },

  // BigQuery On-Demand (Per TiB, but we map to a "Compute Unit" equivalent for the slider if needed, though usually it's hard to map)
  // We'll leave it as Serverless On-Demand mapped to 1 Unit = 1 TiB Scanned equivalent.
  { provider: 'gcp', engine: 'BigQuery', tier: 'Standard', deploymentType: 'Serverless', computeUnitName: 'TiB Scanned-Month', pricePerNormalizedUnit: 6.25 },

  // Event Streaming / Messaging (AWS Kinesis, GCP Pub/Sub, Azure Event Hubs)
  { provider: 'aws', engine: 'Kinesis Data Streams', tier: 'Standard', deploymentType: 'Provisioned', computeUnitName: 'Shard Hour', pricePerNormalizedUnit: 0.015 },
  { provider: 'aws', engine: 'Kinesis Data Streams', tier: 'Standard', deploymentType: 'Serverless', computeUnitName: 'GB', pricePerNormalizedUnit: 0.04 },
  { provider: 'gcp', engine: 'Pub/Sub', tier: 'Standard', deploymentType: 'Serverless', computeUnitName: 'TiB-Month', pricePerNormalizedUnit: 40.00 }, // $40 per TiB processed/month
  { provider: 'azure', engine: 'Event Hubs', tier: 'Standard', deploymentType: 'Provisioned', computeUnitName: 'Throughput Unit', pricePerNormalizedUnit: 0.03 },
  { provider: 'azure', engine: 'Event Hubs', tier: 'Premium', deploymentType: 'Provisioned', computeUnitName: 'Processing Unit', pricePerNormalizedUnit: 0.94 },
  
  // Microsoft Fabric (Azure)
  // Fabric Capacity is billed per Capacity Unit (CU) per hour.
  // F2 = 2 CUs, F4 = 4 CUs, F8 = 8 CUs, etc.
  // East US price is approx $0.18 / CU / hour -> F2 = $0.36, F4 = $0.72.
  { provider: 'azure', engine: 'Microsoft Fabric', tier: 'Capacity F2', deploymentType: 'Serverless', computeUnitName: 'Hour', pricePerNormalizedUnit: 0.36 },
  { provider: 'azure', engine: 'Microsoft Fabric', tier: 'Capacity F4', deploymentType: 'Serverless', computeUnitName: 'Hour', pricePerNormalizedUnit: 0.72 },
  { provider: 'azure', engine: 'Microsoft Fabric', tier: 'Capacity F8', deploymentType: 'Serverless', computeUnitName: 'Hour', pricePerNormalizedUnit: 1.44 },
  { provider: 'azure', engine: 'Microsoft Fabric', tier: 'Capacity F16', deploymentType: 'Serverless', computeUnitName: 'Hour', pricePerNormalizedUnit: 2.88 },
  { provider: 'azure', engine: 'Microsoft Fabric', tier: 'Capacity F32', deploymentType: 'Serverless', computeUnitName: 'Hour', pricePerNormalizedUnit: 5.76 },
  { provider: 'azure', engine: 'Microsoft Fabric', tier: 'Capacity F64', deploymentType: 'Serverless', computeUnitName: 'Hour', pricePerNormalizedUnit: 11.52 },

  { provider: 'oracle', engine: 'OCI Streaming', tier: 'Standard', deploymentType: 'Provisioned', computeUnitName: 'Storage GB-Hour', pricePerNormalizedUnit: 0.025 },
  { provider: 'alibaba', engine: 'ApsaraMQ for Kafka', tier: 'Standard', deploymentType: 'Provisioned', computeUnitName: 'Hour', pricePerNormalizedUnit: 0.2 },
  // NOTE: DigitalOcean's Managed Kafka streaming row lives in
  // digitalocean_data_analytics.ts (its own adapter) — not here; this file's
  // adapter only runs for aws/gcp/azure.
];
