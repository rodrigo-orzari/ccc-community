import type { Sql } from 'postgres';
import { ensureProviderId } from './pricing_pipeline.ts';

const STATIC_INFERENCE_PRICING = [
  // --- AWS SageMaker Endpoints (AI subcategory) ---
  { provider: 'aws', service: 'Amazon SageMaker (Real-time Endpoints)', category: 'Inference', instance_type: 'ml.t3.medium (CPU)', price_per_unit: 0.0582, unit: 'Hour', geography: 'N. America', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'CPU', billing_model: 'Hourly' } },
  { provider: 'aws', service: 'Amazon SageMaker (Real-time Endpoints)', category: 'Inference', instance_type: 'ml.m5.large (CPU)', price_per_unit: 0.1267, unit: 'Hour', geography: 'N. America', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'CPU', billing_model: 'Hourly' } },
  { provider: 'aws', service: 'Amazon SageMaker (Real-time Endpoints)', category: 'Inference', instance_type: 'ml.p3.2xlarge (GPU - 8x NVIDIA V100)', price_per_unit: 3.0600, unit: 'Hour', geography: 'N. America', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'GPU', gpu_type: 'V100', billing_model: 'Hourly' } },
  { provider: 'aws', service: 'Amazon SageMaker Batch Transform', category: 'Inference', instance_type: 'Per ml.m5.large instance hour', price_per_unit: 0.1267, unit: 'Hour', geography: 'N. America', attributes: { model_type: 'Inference', service_type: 'Batch Inference', instance_family: 'CPU', billing_model: 'Hourly' } },

  // --- Azure Machine Learning Endpoints ---
  { provider: 'azure', service: 'Azure Machine Learning Endpoints', category: 'Inference', instance_type: 'Standard_DS3_v2 (CPU)', price_per_unit: 0.402, unit: 'Hour', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'CPU', vm_type: 'Standard' } },
  { provider: 'azure', service: 'Azure Machine Learning Endpoints', category: 'Inference', instance_type: 'Standard_NC12_Promo (GPU - K80)', price_per_unit: 1.848, unit: 'Hour', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'GPU', gpu_type: 'K80' } },
  { provider: 'azure', service: 'Azure Machine Learning Endpoints', category: 'Inference', instance_type: 'Batch Inference (per core hour)', price_per_unit: 0.20, unit: 'Core/Hour', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Batch Inference', billing_model: 'Core Hours' } },

  // --- GCP Vertex AI Endpoints ---
  { provider: 'gcp', service: 'Google Vertex AI Endpoints', category: 'Inference', instance_type: 'n1-standard-2 (CPU)', price_per_unit: 0.1437, unit: 'Hour', geography: 'N. America', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'CPU', machine_type: 'n1-standard' } },
  { provider: 'gcp', service: 'Google Vertex AI Endpoints', category: 'Inference', instance_type: 'a2-highgpu-1g (GPU - A100)', price_per_unit: 3.6829, unit: 'Hour', geography: 'N. America', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'GPU', gpu_type: 'A100' } },
  { provider: 'gcp', service: 'Google Vertex AI Batch Prediction', category: 'Inference', instance_type: 'Per n1-standard-4 node hour', price_per_unit: 0.2875, unit: 'Hour', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Batch Inference', billing_model: 'Node Hours' } },

  // --- Oracle Machine Learning for Model Inference ---
  { provider: 'oracle', service: 'Oracle Machine Learning (Model Inference)', category: 'Inference', instance_type: 'Per OCPU/Month', price_per_unit: 2.80, unit: 'Month', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Model Serving', billing_model: 'OCPU', deployment: 'Autonomous DB' } },
  { provider: 'oracle', service: 'Oracle Machine Learning (Model Inference)', category: 'Inference', instance_type: 'Custom Endpoint', price_per_unit: 0.50, unit: 'Hour', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Model Serving', billing_model: 'Hourly' } },

  // --- DigitalOcean App Platform (inference via containers) ---
  { provider: 'digitalocean', service: 'DigitalOcean App Platform (Model Serving)', category: 'Inference', instance_type: 'Small Container (512MB RAM)', price_per_unit: 0.0012, unit: 'Hour', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Container-based Inference', billing_model: 'Container Hours' } },
  { provider: 'digitalocean', service: 'DigitalOcean App Platform (Model Serving)', category: 'Inference', instance_type: 'Medium Container (1GB RAM)', price_per_unit: 0.0025, unit: 'Hour', geography: 'Global', attributes: { model_type: 'Inference', service_type: 'Container-based Inference', billing_model: 'Container Hours' } },

  // --- Alibaba Machine Learning Platform ---
  { provider: 'alibaba', service: 'Alibaba PAI (Model Inference)', category: 'Inference', instance_type: 'CPU Instance (4 vCPU)', price_per_unit: 0.30, unit: 'Hour', geography: 'Asia Pacific', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'CPU', billing_model: 'Hourly' } },
  { provider: 'alibaba', service: 'Alibaba PAI (Model Inference)', category: 'Inference', instance_type: 'GPU Instance (V100)', price_per_unit: 2.00, unit: 'Hour', geography: 'Asia Pacific', attributes: { model_type: 'Inference', service_type: 'Model Serving', instance_family: 'GPU', gpu_type: 'V100' } },
];

export class InferenceEndpointsPricingPipeline {
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  async run() {
    console.log('🚀 Starting Inference Endpoints Pricing Pipeline...');
    const results: any[] = [];
    let recordsAdded = 0;

    await this.sql.begin(async (sql) => {
      // Clear existing inference data
      await sql`
        DELETE FROM pricing_records
        WHERE data_source = 'static_config'
        AND service_id IN (
          SELECT id FROM services WHERE category = 'Inference'
        )
      `;

      for (const record of STATIC_INFERENCE_PRICING) {
        const providerId = await ensureProviderId(sql, record.provider);

        let serviceRes = await sql`SELECT id FROM services WHERE provider_id = ${providerId} AND name = ${record.service} AND category = 'Inference'`;
        let serviceId: string;

        if (serviceRes.length === 0) {
          const insertService = await sql`
            INSERT INTO services (provider_id, name, category) VALUES (${providerId}, ${record.service}, 'Inference') RETURNING id
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

    results.push({ provider: 'all_inference', status: 'success', recordsProcessed: recordsAdded });
    console.log(`✅ Inference Endpoints Pricing Pipeline Completed. Inserted ${recordsAdded} records.`);
    return results;
  }
}
