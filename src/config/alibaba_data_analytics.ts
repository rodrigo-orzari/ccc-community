export const ALIBABA_ANALYTICS_REGION = 'ap-southeast-1'; // Singapore — primary international region
export const ALIBABA_ANALYTICS_GEOGRAPHY = 'Asia Pacific';

export interface AlibabaAnalyticsConfig {
  serviceName: string;
  engine: string;
  tier: string;
  deploymentType: 'Provisioned' | 'Serverless';
  computeUnitName: string;
  pricePerUnit: number;
}

// Alibaba Cloud analytics portfolio (Singapore / ap-southeast-1 international pricing).
// MaxCompute (formerly ODPS) — native big data / data warehouse, equivalent of BigQuery/Redshift.
//   Source: https://www.alibabacloud.com/product/maxcompute/pricing
// Hologres — real-time interactive analytics (HSAP); billed per CU-Hour (1 CU = 1 core + 4GB).
//   Source: https://www.alibabacloud.com/help/en/hologres/product-overview/pay-as-you-go ($0.066604/CU-hr, Singapore, 2026-06)
// AnalyticDB for MySQL — MPP data warehouse; Cluster Edition billed per node-hour
//   ($1.28/node-hr, 1 node = 16 cores → ~$0.08/core-hr, Singapore, 2026-06).
//   Source: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/product-overview/pricing-for-data-warehouse-edition-v3
export const ALIBABA_ANALYTICS_INSTANCES: AlibabaAnalyticsConfig[] = [
  // MaxCompute — Pay-As-You-Go (per SQL CU-Hour)
  {
    serviceName: 'MaxCompute',
    engine: 'MaxCompute',
    tier: 'Standard',
    deploymentType: 'Serverless',
    computeUnitName: 'CU',
    pricePerUnit: 0.044,
  },
  // MaxCompute Subscription (reserved CU capacity at $0.032/CU-hour) was
  // listed here as an 'Enterprise' tier and REMOVED 2026-07-28. It is a
  // commitment-based rate, and the site carries on-demand only — see the
  // pricing-mode rule in Web/CLAUDE.md. Worse than merely off-policy: it sat
  // alongside the Pay-As-You-Go row for the same service at a 27% lower
  // price, and every consumer here picks the cheapest match, so the
  // subscription rate would have won every MaxCompute comparison while
  // presenting as a standard rate. Do not reinstate it.
  // E-MapReduce — managed Apache Spark / Hadoop / Flink service
  // Base compute pricing per EMR Instance-Hour (ecs.c6.xlarge equivalent)
  // Comparable to AWS EMR or Databricks Community Edition
  {
    serviceName: 'E-MapReduce',
    engine: 'E-MapReduce',
    tier: 'Standard',
    deploymentType: 'Provisioned',
    computeUnitName: 'Instance-Hr',
    pricePerUnit: 0.15,
  },
  // Hologres — real-time interactive analytics, Pay-As-You-Go per CU-Hour
  {
    serviceName: 'Hologres',
    engine: 'Hologres',
    tier: 'Standard',
    deploymentType: 'Serverless',
    computeUnitName: 'CU',
    pricePerUnit: 0.066604,
  },
  // AnalyticDB for MySQL — MPP data warehouse, Cluster Edition (normalized per core-hour)
  {
    serviceName: 'AnalyticDB for MySQL',
    engine: 'AnalyticDB for MySQL',
    tier: 'Enterprise',
    deploymentType: 'Provisioned',
    computeUnitName: 'Core',
    pricePerUnit: 0.08,
  },
];
