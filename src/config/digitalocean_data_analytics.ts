export const DIGITALOCEAN_ANALYTICS_REGION = 'nyc3';
export const DIGITALOCEAN_ANALYTICS_GEOGRAPHY = 'N. America';

export interface DigitalOceanAnalyticsConfig {
  serviceName: string;
  engine: string;
  tier: string;
  deploymentType: 'Provisioned' | 'Serverless';
  computeUnitName: string;
  pricePerUnit: number;
}

// DigitalOcean does not offer a true data-warehouse product (no Redshift/BigQuery/Synapse
// equivalent). Its analytics-adjacent managed services are OpenSearch (search & log analytics)
// and Kafka (streaming/event analytics), both sold as fixed managed-database plans.
// Prices below are the smallest plans normalized from monthly list price to per-hour (÷730).
// Source: https://www.digitalocean.com/pricing/managed-databases (2026-06)
export const DIGITALOCEAN_ANALYTICS_INSTANCES: DigitalOceanAnalyticsConfig[] = [
  // Managed OpenSearch — single node, 2 GiB RAM / 1 vCPU ($19.60/mo ÷ 730)
  {
    serviceName: 'Managed OpenSearch',
    engine: 'OpenSearch',
    tier: 'Standard',
    deploymentType: 'Provisioned',
    computeUnitName: 'Node (2GB)',
    pricePerUnit: 0.026849,
  },
  // Managed Kafka — smallest HA cluster, 3 brokers, 6 GiB / 6 vCPU total ($148.80/mo ÷ 730)
  {
    serviceName: 'Managed Kafka',
    engine: 'Kafka',
    tier: 'Standard',
    deploymentType: 'Provisioned',
    computeUnitName: 'Cluster (3-broker)',
    pricePerUnit: 0.203836,
  },
];
