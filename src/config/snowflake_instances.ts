export const SNOWFLAKE_AWS_REGION = 'us-east-1';
export const SNOWFLAKE_AZURE_REGION = 'eastus2';
export const SNOWFLAKE_GCP_REGION = 'us-central1';

export interface SnowflakeConfig {
  provider: 'aws' | 'azure' | 'gcp';
  tier: 'Standard' | 'Enterprise' | 'Business Critical';
  deploymentType: 'Serverless' | 'Provisioned';
  pricePerCredit: number;
}

export const SNOWFLAKE_INSTANCES: SnowflakeConfig[] = [
  // AWS
  { provider: 'aws', tier: 'Standard', deploymentType: 'Provisioned', pricePerCredit: 2.00 },
  { provider: 'aws', tier: 'Enterprise', deploymentType: 'Provisioned', pricePerCredit: 3.00 },
  { provider: 'aws', tier: 'Business Critical', deploymentType: 'Provisioned', pricePerCredit: 4.00 },
  // Azure
  { provider: 'azure', tier: 'Standard', deploymentType: 'Provisioned', pricePerCredit: 2.00 },
  { provider: 'azure', tier: 'Enterprise', deploymentType: 'Provisioned', pricePerCredit: 3.00 },
  { provider: 'azure', tier: 'Business Critical', deploymentType: 'Provisioned', pricePerCredit: 4.00 },
  // GCP
  { provider: 'gcp', tier: 'Standard', deploymentType: 'Provisioned', pricePerCredit: 2.00 },
  { provider: 'gcp', tier: 'Enterprise', deploymentType: 'Provisioned', pricePerCredit: 3.00 },
  { provider: 'gcp', tier: 'Business Critical', deploymentType: 'Provisioned', pricePerCredit: 4.00 },
];
