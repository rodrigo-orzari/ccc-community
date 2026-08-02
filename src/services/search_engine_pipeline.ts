import type { Sql } from 'postgres';
import { ensureProviderId } from './pricing_pipeline.ts';

const STATIC_SEARCH_PRICING = [
  // --- AWS OpenSearch Service ---
  { provider: 'aws', service: 'Amazon OpenSearch Service', category: 'Search', instance_type: 't3.small.search (2GB RAM)', price_per_unit: 0.072, unit: 'Hour', geography: 'N. America', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', instance_family: 'Burstable' } },
  { provider: 'aws', service: 'Amazon OpenSearch Service', category: 'Search', instance_type: 't3.medium.search (4GB RAM)', price_per_unit: 0.145, unit: 'Hour', geography: 'N. America', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', instance_family: 'Burstable' } },
  { provider: 'aws', service: 'Amazon OpenSearch Service', category: 'Search', instance_type: 'r7g.large.search (16GB RAM)', price_per_unit: 0.393, unit: 'Hour', geography: 'N. America', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', instance_family: 'Memory Optimized' } },
  { provider: 'aws', service: 'Amazon OpenSearch Service', category: 'Search', instance_type: 'Storage (per GB/month)', price_per_unit: 0.23, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', billing_model: 'Storage' } },

  // --- Azure Cognitive Search ---
  { provider: 'azure', service: 'Azure Cognitive Search', category: 'Search', instance_type: 'Free (3 indexes, 50MB)', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Cognitive Search', search_type: 'Enterprise Search', tier: 'Free', max_indexes: 3 } },
  { provider: 'azure', service: 'Azure Cognitive Search', category: 'Search', instance_type: 'Basic (15 indexes, 2GB)', price_per_unit: 75.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Cognitive Search', search_type: 'Enterprise Search', tier: 'Basic', max_indexes: 15 } },
  { provider: 'azure', service: 'Azure Cognitive Search', category: 'Search', instance_type: 'Standard (200 indexes, 25GB)', price_per_unit: 250.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Cognitive Search', search_type: 'Enterprise Search', tier: 'Standard', max_indexes: 200 } },
  { provider: 'azure', service: 'Azure Cognitive Search', category: 'Search', instance_type: 'High Density (200 indexes, 200GB)', price_per_unit: 2000.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Cognitive Search', search_type: 'Enterprise Search', tier: 'High Density', max_indexes: 200 } },

  // --- GCP Cloud Search (Enterprise) ---
  { provider: 'gcp', service: 'Google Cloud Search', category: 'Search', instance_type: 'Indexing API (per 10K documents)', price_per_unit: 5.00, unit: 'Per 10K Docs', geography: 'Global', attributes: { engine: 'Cloud Search', search_type: 'Enterprise Search', billing_model: 'API Calls' } },
  { provider: 'gcp', service: 'Google Cloud Search', category: 'Search', instance_type: 'Query API (per 1K queries)', price_per_unit: 2.50, unit: 'Per 1K Queries', geography: 'Global', attributes: { engine: 'Cloud Search', search_type: 'Enterprise Search', billing_model: 'API Calls' } },

  // --- Oracle OpenSearch (via OCI) ---
  { provider: 'oracle', service: 'Oracle OpenSearch Service', category: 'Search', instance_type: 'Data Node (2 vCPU, 8GB)', price_per_unit: 0.20, unit: 'Hour', geography: 'Global', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', deployment_type: 'OCI Managed' } },
  { provider: 'oracle', service: 'Oracle OpenSearch Service', category: 'Search', instance_type: 'Storage (per GB/month)', price_per_unit: 0.10, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', billing_model: 'Storage' } },

  // --- Alibaba OpenSearch ---
  { provider: 'alibaba', service: 'Alibaba OpenSearch', category: 'Search', instance_type: 'Basic (2 nodes)', price_per_unit: 0.40, unit: 'Hour', geography: 'Asia Pacific', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', deployment_type: 'Managed', tier: 'Basic' } },
  { provider: 'alibaba', service: 'Alibaba OpenSearch', category: 'Search', instance_type: 'Standard (3+ nodes)', price_per_unit: 0.60, unit: 'Hour', geography: 'Asia Pacific', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', deployment_type: 'Managed', tier: 'Standard' } },
  { provider: 'alibaba', service: 'Alibaba OpenSearch', category: 'Search', instance_type: 'Storage (per GB/month)', price_per_unit: 0.15, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'OpenSearch', search_type: 'Full-Text Search', billing_model: 'Storage' } },

  // --- DigitalOcean App Platform (for Elasticsearch/OpenSearch) ---
  { provider: 'digitalocean', service: 'Managed Elasticsearch (via 3rd party)', category: 'Search', instance_type: 'Basic Cluster', price_per_unit: 45.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Elasticsearch', search_type: 'Full-Text Search', deployment_type: 'Third-party', note: 'Via Marketplace' } },
];

export class SearchEnginePricingPipeline {
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  async run() {
    console.log('🚀 Starting Search Engine Pricing Pipeline...');
    const results: any[] = [];
    let recordsAdded = 0;

    await this.sql.begin(async (sql) => {
      // Clear existing search data
      await sql`
        DELETE FROM pricing_records
        WHERE data_source = 'static_config'
        AND service_id IN (
          SELECT id FROM services WHERE category = 'Search'
        )
      `;

      for (const record of STATIC_SEARCH_PRICING) {
        const providerId = await ensureProviderId(sql, record.provider);

        let serviceRes = await sql`SELECT id FROM services WHERE provider_id = ${providerId} AND name = ${record.service} AND category = 'Search'`;
        let serviceId: string;

        if (serviceRes.length === 0) {
          const insertService = await sql`
            INSERT INTO services (provider_id, name, category) VALUES (${providerId}, ${record.service}, 'Search') RETURNING id
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

    results.push({ provider: 'all_search', status: 'success', recordsProcessed: recordsAdded });
    console.log(`✅ Search Engine Pricing Pipeline Completed. Inserted ${recordsAdded} records.`);
    return results;
  }
}
