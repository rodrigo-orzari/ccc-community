export const DATABRICKS_AWS_REGION = 'us-east-1';
export const DATABRICKS_GCP_REGION = 'us-central1';

export interface DatabricksConfig {
  provider: 'aws' | 'gcp';
  tier: 'Standard' | 'Premium' | 'Enterprise';
  computeType: string;
  deploymentType: 'Provisioned' | 'Serverless';
  pricePerDbu: number;
}

export const DATABRICKS_INSTANCES: DatabricksConfig[] = [
  // AWS - Standard
  { provider: 'aws', tier: 'Standard', computeType: 'Jobs Compute', deploymentType: 'Provisioned', pricePerDbu: 0.15 },
  { provider: 'aws', tier: 'Standard', computeType: 'SQL Compute', deploymentType: 'Provisioned', pricePerDbu: 0.22 },
  { provider: 'aws', tier: 'Standard', computeType: 'All-Purpose Compute', deploymentType: 'Provisioned', pricePerDbu: 0.40 },
  // AWS - Premium
  { provider: 'aws', tier: 'Premium', computeType: 'Jobs Compute', deploymentType: 'Provisioned', pricePerDbu: 0.30 },
  { provider: 'aws', tier: 'Premium', computeType: 'SQL Compute', deploymentType: 'Provisioned', pricePerDbu: 0.44 },
  { provider: 'aws', tier: 'Premium', computeType: 'All-Purpose Compute', deploymentType: 'Provisioned', pricePerDbu: 0.55 },
  { provider: 'aws', tier: 'Premium', computeType: 'Serverless SQL Compute', deploymentType: 'Serverless', pricePerDbu: 0.70 },
  // AWS - Enterprise
  { provider: 'aws', tier: 'Enterprise', computeType: 'Jobs Compute', deploymentType: 'Provisioned', pricePerDbu: 0.30 },
  { provider: 'aws', tier: 'Enterprise', computeType: 'SQL Compute', deploymentType: 'Provisioned', pricePerDbu: 0.44 },
  { provider: 'aws', tier: 'Enterprise', computeType: 'All-Purpose Compute', deploymentType: 'Provisioned', pricePerDbu: 0.55 },
  { provider: 'aws', tier: 'Enterprise', computeType: 'Serverless SQL Compute', deploymentType: 'Serverless', pricePerDbu: 0.70 },

  // GCP - Standard
  { provider: 'gcp', tier: 'Standard', computeType: 'Jobs Compute', deploymentType: 'Provisioned', pricePerDbu: 0.15 },
  { provider: 'gcp', tier: 'Standard', computeType: 'SQL Compute', deploymentType: 'Provisioned', pricePerDbu: 0.22 },
  { provider: 'gcp', tier: 'Standard', computeType: 'All-Purpose Compute', deploymentType: 'Provisioned', pricePerDbu: 0.40 },
  // GCP - Premium
  { provider: 'gcp', tier: 'Premium', computeType: 'Jobs Compute', deploymentType: 'Provisioned', pricePerDbu: 0.30 },
  { provider: 'gcp', tier: 'Premium', computeType: 'SQL Compute', deploymentType: 'Provisioned', pricePerDbu: 0.44 },
  { provider: 'gcp', tier: 'Premium', computeType: 'All-Purpose Compute', deploymentType: 'Provisioned', pricePerDbu: 0.55 },
];
