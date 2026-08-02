export const ORACLE_ANALYTICS_REGION = 'us-ashburn-1';
export const ORACLE_ANALYTICS_GEOGRAPHY = 'N. America';

export interface OracleAnalyticsConfig {
  serviceName: string;
  engine: string;
  tier: string;
  deploymentType: 'Provisioned' | 'Serverless';
  computeUnitName: string;
  pricePerUnit: number;
}

// Oracle Analytics Cloud (OAC) — Oracle's native BI and data analytics platform.
// Pricing is per OCPU-Hour (Oracle Compute Unit).
// Source: https://www.oracle.com/business-analytics/analytics-cloud/pricing/
//
// Plus Oracle Autonomous Data Warehouse (ADW) — the serverless warehouse.
// Source: https://www.oracle.com/autonomous-database/pricing/ ($0.336/ECPU-hour, 2026-06).
export const ORACLE_ANALYTICS_INSTANCES: OracleAnalyticsConfig[] = [
  // Oracle Analytics Cloud — Standard Edition (self-service BI, up to 25 OCPUs)
  {
    serviceName: 'Oracle Analytics Cloud',
    engine: 'Oracle Analytics Cloud',
    tier: 'Standard',
    deploymentType: 'Provisioned',
    computeUnitName: 'OCPU',
    pricePerUnit: 2.00,
  },
  // Oracle Analytics Cloud — Enterprise Edition (advanced ML, data prep, full feature set)
  {
    serviceName: 'Oracle Analytics Cloud',
    engine: 'Oracle Analytics Cloud',
    tier: 'Enterprise',
    deploymentType: 'Provisioned',
    computeUnitName: 'OCPU',
    pricePerUnit: 3.20,
  },
  // Oracle Autonomous Data Warehouse (ADW) — fully managed, auto-tuning data warehouse.
  // Serverless, billed per ECPU-Hour. Direct competitor to Redshift/BigQuery/Synapse.
  {
    serviceName: 'Oracle Autonomous Data Warehouse',
    engine: 'Oracle Autonomous Data Warehouse',
    tier: 'Standard',
    deploymentType: 'Serverless',
    computeUnitName: 'ECPU',
    pricePerUnit: 0.336,
  },
];
