import type { Sql } from 'postgres';
import { ensureProviderId } from './pricing_pipeline.ts';

const STATIC_TIME_SERIES_PRICING = [
  // --- AWS Timestream (Database subcategory: Time-Series) ---
  { provider: 'aws', service: 'Amazon Timestream', category: 'Time-Series', instance_type: 'Write Capacity Unit', price_per_unit: 0.50, unit: 'Hour', geography: 'Global', attributes: { engine: 'Timestream', database_type: 'Time-Series', billing_model: 'Capacity Units' } },
  { provider: 'aws', service: 'Amazon Timestream', category: 'Time-Series', instance_type: 'Read Capacity Unit', price_per_unit: 0.50, unit: 'Hour', geography: 'Global', attributes: { engine: 'Timestream', database_type: 'Time-Series', billing_model: 'Capacity Units' } },
  { provider: 'aws', service: 'Amazon Timestream', category: 'Time-Series', instance_type: 'Storage (Recent)', price_per_unit: 0.02, unit: 'GB/Hour', geography: 'Global', attributes: { engine: 'Timestream', database_type: 'Time-Series', billing_model: 'Storage', tier: 'Recent' } },
  { provider: 'aws', service: 'Amazon Timestream', category: 'Time-Series', instance_type: 'Storage (Historical)', price_per_unit: 0.03, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'Timestream', database_type: 'Time-Series', billing_model: 'Storage', tier: 'Historical' } },

  // --- Azure Data Explorer (Kusto) ---
  { provider: 'azure', service: 'Azure Data Explorer', category: 'Time-Series', instance_type: 'Dev/Test (1 node)', price_per_unit: 0.14, unit: 'Hour', geography: 'Global', attributes: { engine: 'Kusto', database_type: 'Time-Series', billing_model: 'Cluster Hourly' } },
  { provider: 'azure', service: 'Azure Data Explorer', category: 'Time-Series', instance_type: 'Standard (D13_v2)', price_per_unit: 3.34, unit: 'Hour', geography: 'Global', attributes: { engine: 'Kusto', database_type: 'Time-Series', billing_model: 'Cluster Hourly' } },
  { provider: 'azure', service: 'Azure Data Explorer', category: 'Time-Series', instance_type: 'Storage (Cold)', price_per_unit: 0.02, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'Kusto', database_type: 'Time-Series', billing_model: 'Storage', tier: 'Cold' } },

  // --- GCP Bigtable (Time-Series workload) ---
  { provider: 'gcp', service: 'Google Cloud Bigtable', category: 'Time-Series', instance_type: 'Per Node (Production)', price_per_unit: 1.50, unit: 'Hour', geography: 'N. America', attributes: { engine: 'Bigtable', database_type: 'Time-Series', billing_model: 'Node Hour' } },
  { provider: 'gcp', service: 'Google Cloud Bigtable', category: 'Time-Series', instance_type: 'Storage (Standard)', price_per_unit: 0.18, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'Bigtable', database_type: 'Time-Series', billing_model: 'Storage' } },
  { provider: 'gcp', service: 'Google Cloud Bigtable', category: 'Time-Series', instance_type: 'Replication (per GB)', price_per_unit: 0.25, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'Bigtable', database_type: 'Time-Series', billing_model: 'Replication' } },

  // --- Oracle Time Series (via Autonomous Database) ---
  { provider: 'oracle', service: 'Autonomous Database (Time Series)', category: 'Time-Series', instance_type: 'Per OCPU/Month', price_per_unit: 2.80, unit: 'Month', geography: 'Global', attributes: { engine: 'Oracle Database', database_type: 'Time-Series', billing_model: 'OCPU' } },
  { provider: 'oracle', service: 'Autonomous Database (Time Series)', category: 'Time-Series', instance_type: 'Storage (per TB/Month)', price_per_unit: 200.00, unit: 'TB/Month', geography: 'Global', attributes: { engine: 'Oracle Database', database_type: 'Time-Series', billing_model: 'Storage' } },

  // --- DigitalOcean Managed Database (PostgreSQL for Time-Series) ---
  { provider: 'digitalocean', service: 'Managed PostgreSQL (Time-Series)', category: 'Time-Series', instance_type: 'Basic (1GB RAM)', price_per_unit: 15.00, unit: 'Month', geography: 'Global', attributes: { engine: 'PostgreSQL with TimescaleDB', database_type: 'Time-Series', billing_model: 'Plan' } },
  { provider: 'digitalocean', service: 'Managed PostgreSQL (Time-Series)', category: 'Time-Series', instance_type: 'Pro (4GB RAM)', price_per_unit: 60.00, unit: 'Month', geography: 'Global', attributes: { engine: 'PostgreSQL with TimescaleDB', database_type: 'Time-Series', billing_model: 'Plan' } },

  // --- Alibaba Time Series Database ---
  { provider: 'alibaba', service: 'Time Series Database (TSDB)', category: 'Time-Series', instance_type: 'Basic (4 vCPU, 8GB)', price_per_unit: 0.15, unit: 'Hour', geography: 'Asia Pacific', attributes: { engine: 'TSDB', database_type: 'Time-Series', billing_model: 'Hourly' } },
  { provider: 'alibaba', service: 'Time Series Database (TSDB)', category: 'Time-Series', instance_type: 'Storage', price_per_unit: 0.02, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'TSDB', database_type: 'Time-Series', billing_model: 'Storage' } },
];

export class TimeSeriesPricingPipeline {
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  async run() {
    console.log('🚀 Starting Time-Series Database Pricing Pipeline...');
    const results: any[] = [];
    let recordsAdded = 0;

    await this.sql.begin(async (sql) => {
      // Clear existing time-series data (now under 'Time-Series' category)
      await sql`
        DELETE FROM pricing_records
        WHERE data_source = 'static_config'
        AND service_id IN (
          SELECT id FROM services WHERE category = 'Time-Series'
        )
      `;

      for (const record of STATIC_TIME_SERIES_PRICING) {
        const providerId = await ensureProviderId(sql, record.provider);

        let serviceRes = await sql`SELECT id FROM services WHERE provider_id = ${providerId} AND name = ${record.service} AND category = 'Time-Series'`;
        let serviceId: string;

        if (serviceRes.length === 0) {
          const insertService = await sql`
            INSERT INTO services (provider_id, name, category) VALUES (${providerId}, ${record.service}, 'Time-Series') RETURNING id
          `;
          serviceId = insertService[0].id;
        } else {
          serviceId = serviceRes[0].id;
        }

        await sql`
          INSERT INTO pricing_records
            (service_id, instance_type, category, geography, price_per_unit, unit, attributes, data_source, updated_at)
           VALUES (
             ${serviceId}, ${record.instance_type}, ${record.category}, ${record.geography},
             ${record.price_per_unit}, ${record.unit}, ${sql.json(record.attributes)},
             'static_config', NOW()
           )
        `;
        recordsAdded++;
      }
    });

    results.push({ provider: 'all_time_series', status: 'success', recordsProcessed: recordsAdded });
    console.log(`✅ Time-Series Database Pricing Pipeline Completed. Inserted ${recordsAdded} records.`);
    return results;
  }
}
