import type { Sql } from 'postgres';
import { ensureProviderId } from './pricing_pipeline.ts';

const STATIC_GRAPH_PRICING = [
  // --- AWS Neptune (Database subcategory: Graph) ---
  { provider: 'aws', service: 'Amazon Neptune', category: 'Graph', instance_type: 'db.r6g.large (2 vCPU, 16GB)', price_per_unit: 2.469, unit: 'Hour', geography: 'N. America', attributes: { engine: 'Neptune', database_type: 'Graph', deployment_type: 'Cluster', instance_family: 'Memory Optimized' } },
  { provider: 'aws', service: 'Amazon Neptune', category: 'Graph', instance_type: 'db.r6g.xlarge (4 vCPU, 32GB)', price_per_unit: 4.938, unit: 'Hour', geography: 'N. America', attributes: { engine: 'Neptune', database_type: 'Graph', deployment_type: 'Cluster', instance_family: 'Memory Optimized' } },
  { provider: 'aws', service: 'Amazon Neptune', category: 'Graph', instance_type: 'Storage (per GB/month)', price_per_unit: 1.00, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'Neptune', database_type: 'Graph', billing_model: 'Storage' } },
  { provider: 'aws', service: 'Amazon Neptune', category: 'Graph', instance_type: 'Data Transfer Out (per GB)', price_per_unit: 0.02, unit: 'GB', geography: 'Global', attributes: { engine: 'Neptune', database_type: 'Graph', billing_model: 'Data Transfer' } },

  // --- Azure Cosmos DB (Graph/Gremlin API) ---
  { provider: 'azure', service: 'Azure Cosmos DB (Gremlin API)', category: 'Graph', instance_type: 'Provisioned Throughput (400 RU/s)', price_per_unit: 24.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Cosmos DB', database_type: 'Graph', deployment_type: 'Provisioned', api: 'Gremlin' } },
  { provider: 'azure', service: 'Azure Cosmos DB (Gremlin API)', category: 'Graph', instance_type: 'Provisioned Throughput (1000 RU/s)', price_per_unit: 60.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Cosmos DB', database_type: 'Graph', deployment_type: 'Provisioned', api: 'Gremlin' } },
  { provider: 'azure', service: 'Azure Cosmos DB (Gremlin API)', category: 'Graph', instance_type: 'Serverless (per million requests)', price_per_unit: 0.25, unit: '1M Requests', geography: 'Global', attributes: { engine: 'Cosmos DB', database_type: 'Graph', deployment_type: 'Serverless', api: 'Gremlin' } },
  { provider: 'azure', service: 'Azure Cosmos DB (Gremlin API)', category: 'Graph', instance_type: 'Storage (per GB/month)', price_per_unit: 1.25, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'Cosmos DB', database_type: 'Graph', billing_model: 'Storage' } },

  // --- GCP Memgraph Cloud (managed) ---
  { provider: 'gcp', service: 'Memgraph Cloud', category: 'Graph', instance_type: 'Small (1GB)', price_per_unit: 99.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Memgraph', database_type: 'Graph', deployment_type: 'Managed', tier: 'Small' } },
  { provider: 'gcp', service: 'Memgraph Cloud', category: 'Graph', instance_type: 'Medium (10GB)', price_per_unit: 499.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Memgraph', database_type: 'Graph', deployment_type: 'Managed', tier: 'Medium' } },
  { provider: 'gcp', service: 'Memgraph Cloud', category: 'Graph', instance_type: 'Large (100GB)', price_per_unit: 1999.00, unit: 'Month', geography: 'Global', attributes: { engine: 'Memgraph', database_type: 'Graph', deployment_type: 'Managed', tier: 'Large' } },

  // --- Oracle Graph Database (via Autonomous) ---
  { provider: 'oracle', service: 'Oracle Autonomous Database (Graph)', category: 'Graph', instance_type: 'Per OCPU/Month', price_per_unit: 2.80, unit: 'Month', geography: 'Global', attributes: { engine: 'Oracle Database', database_type: 'Graph', deployment_type: 'Autonomous', workload: 'Graph' } },
  { provider: 'oracle', service: 'Oracle Autonomous Database (Graph)', category: 'Graph', instance_type: 'Storage (per TB/month)', price_per_unit: 200.00, unit: 'TB/Month', geography: 'Global', attributes: { engine: 'Oracle Database', database_type: 'Graph', billing_model: 'Storage' } },

  // --- DigitalOcean (via managed PostgreSQL or external) ---
  { provider: 'digitalocean', service: 'Managed PostgreSQL (with PostGIS Graph)', category: 'Graph', instance_type: 'Basic (1GB RAM)', price_per_unit: 15.00, unit: 'Month', geography: 'Global', attributes: { engine: 'PostgreSQL', database_type: 'Graph', deployment_type: 'Managed', extension: 'PostGIS/AGE' } },
  { provider: 'digitalocean', service: 'Managed PostgreSQL (with PostGIS Graph)', category: 'Graph', instance_type: 'Pro (4GB RAM)', price_per_unit: 60.00, unit: 'Month', geography: 'Global', attributes: { engine: 'PostgreSQL', database_type: 'Graph', deployment_type: 'Managed', extension: 'PostGIS/AGE' } },

  // --- Alibaba Graph Database ---
  { provider: 'alibaba', service: 'Alibaba Graph Compute', category: 'Graph', instance_type: 'Basic (4 vCPU, 8GB)', price_per_unit: 0.20, unit: 'Hour', geography: 'Asia Pacific', attributes: { engine: 'GDB', database_type: 'Graph', deployment_type: 'Managed', tier: 'Basic' } },
  { provider: 'alibaba', service: 'Alibaba Graph Compute', category: 'Graph', instance_type: 'Storage', price_per_unit: 0.05, unit: 'GB/Month', geography: 'Global', attributes: { engine: 'GDB', database_type: 'Graph', billing_model: 'Storage' } },
];

export class GraphDatabasePricingPipeline {
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  async run() {
    console.log('🚀 Starting Graph Database Pricing Pipeline...');
    const results: any[] = [];
    let recordsAdded = 0;

    await this.sql.begin(async (sql) => {
      // Clear existing graph data
      await sql`
        DELETE FROM pricing_records
        WHERE data_source = 'static_config'
        AND service_id IN (
          SELECT id FROM services WHERE category = 'Graph'
        )
      `;

      for (const record of STATIC_GRAPH_PRICING) {
        const providerId = await ensureProviderId(sql, record.provider);

        let serviceRes = await sql`SELECT id FROM services WHERE provider_id = ${providerId} AND name = ${record.service} AND category = 'Graph'`;
        let serviceId: string;

        if (serviceRes.length === 0) {
          const insertService = await sql`
            INSERT INTO services (provider_id, name, category) VALUES (${providerId}, ${record.service}, 'Graph') RETURNING id
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

    results.push({ provider: 'all_graph', status: 'success', recordsProcessed: recordsAdded });
    console.log(`✅ Graph Database Pricing Pipeline Completed. Inserted ${recordsAdded} records.`);
    return results;
  }
}
