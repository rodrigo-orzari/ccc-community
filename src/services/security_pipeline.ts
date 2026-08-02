import type { Sql } from 'postgres';
import { ensureProviderId } from './pricing_pipeline.ts';

const STATIC_SECURITY_PRICING = [
  // --- AWS ---
  { provider: 'aws', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'Per Web ACL', price_per_unit: 5.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Global' } },
  { provider: 'aws', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'Per 1M Requests', price_per_unit: 0.60, unit: '1M Requests', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Global' } },
  { provider: 'aws', service: 'Identity & Access Management (IAM)', category: 'Identity & Encryption', instance_type: 'IAM Users', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'IAM', scope: 'Global' } },
  { provider: 'aws', service: 'Key Management Service (KMS)', category: 'Identity & Encryption', instance_type: 'Per CMK', price_per_unit: 1.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'KMS', scope: 'Regional' } },
  { provider: 'aws', service: 'Key Management Service (KMS)', category: 'Identity & Encryption', instance_type: 'Per 10K Requests', price_per_unit: 0.03, unit: '10K Requests', geography: 'Global', attributes: { security_type: 'KMS', scope: 'Regional' } },
  { provider: 'aws', service: 'DDoS Protection', category: 'Network Security', instance_type: 'Shield Advanced', price_per_unit: 3000.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'DDoS', scope: 'Global' } },
  { provider: 'aws', service: 'Threat Detection', category: 'Network Security', instance_type: 'GuardDuty (Per GB CloudTrail)', price_per_unit: 4.00, unit: 'GB', geography: 'N. America', attributes: { security_type: 'Threat Detection', scope: 'Regional' } },

  // --- GCP ---
  { provider: 'gcp', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'Standard Tier (Per Policy)', price_per_unit: 5.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Global' } },
  { provider: 'gcp', service: 'Identity & Access Management (IAM)', category: 'Identity & Encryption', instance_type: 'IAM Service Accounts', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'IAM', scope: 'Global' } },
  { provider: 'gcp', service: 'Key Management Service (KMS)', category: 'Identity & Encryption', instance_type: 'Per Key Version', price_per_unit: 0.06, unit: 'Month', geography: 'Global', attributes: { security_type: 'KMS', scope: 'Regional' } },
  { provider: 'gcp', service: 'Key Management Service (KMS)', category: 'Identity & Encryption', instance_type: 'Per 10K Operations', price_per_unit: 0.03, unit: '10K Operations', geography: 'Global', attributes: { security_type: 'KMS', scope: 'Regional' } },
  { provider: 'gcp', service: 'DDoS Protection', category: 'Network Security', instance_type: 'Cloud Armor Managed Protection', price_per_unit: 3000.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'DDoS', scope: 'Global' } },
  { provider: 'gcp', service: 'Threat Detection', category: 'Network Security', instance_type: 'Security Command Center (Premium)', price_per_unit: 0.00, unit: 'Custom', geography: 'Global', attributes: { security_type: 'Threat Detection', scope: 'Global' } },

  // --- Azure ---
  { provider: 'azure', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'WAF on App Gateway (Per Policy)', price_per_unit: 5.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Regional' } },
  { provider: 'azure', service: 'Identity & Access Management (IAM)', category: 'Identity & Encryption', instance_type: 'Entra ID (Free Tier)', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'IAM', scope: 'Global' } },
  { provider: 'azure', service: 'Key Management Service (KMS)', category: 'Identity & Encryption', instance_type: 'Key Vault (Standard)', price_per_unit: 0.03, unit: '10K Operations', geography: 'Global', attributes: { security_type: 'KMS', scope: 'Regional' } },
  { provider: 'azure', service: 'DDoS Protection', category: 'Network Security', instance_type: 'DDoS Network Protection', price_per_unit: 2944.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'DDoS', scope: 'Global' } },
  { provider: 'azure', service: 'Threat Detection', category: 'Network Security', instance_type: 'Microsoft Defender for Cloud (Servers)', price_per_unit: 15.00, unit: 'Server/Month', geography: 'Global', attributes: { security_type: 'Threat Detection', scope: 'Global' } },

  // --- Oracle ---
  { provider: 'oracle', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'WAF Instance', price_per_unit: 0.60, unit: '1M Requests', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Regional' } },
  { provider: 'oracle', service: 'Identity & Access Management (IAM)', category: 'Identity & Encryption', instance_type: 'IAM Domain (Free)', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'IAM', scope: 'Global' } },
  { provider: 'oracle', service: 'Key Management Service (KMS)', category: 'Identity & Encryption', instance_type: 'Vault Key Management', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'KMS', scope: 'Regional' } },
  { provider: 'oracle', service: 'Threat Detection', category: 'Network Security', instance_type: 'Cloud Guard', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'Threat Detection', scope: 'Global' } },

  // --- DigitalOcean ---
  { provider: 'digitalocean', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'Included with LB', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Regional' } },
  
  // --- Alibaba ---
  { provider: 'alibaba', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'WAF Base Plan', price_per_unit: 29.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Regional' } },
  { provider: 'alibaba', service: 'DDoS Protection', category: 'Network Security', instance_type: 'Anti-DDoS Premium', price_per_unit: 3000.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'DDoS', scope: 'Global' } },
  // Added 2026-07-15: Alibaba genuinely offers KMS and Security Center — their
  // absence made Alibaba show N/A on Identity & Encryption / Network Security
  // workload components. Prices from Alibaba's published international billing docs.
  { provider: 'alibaba', service: 'Key Management Service (KMS)', category: 'Identity & Encryption', instance_type: 'Per CMK (HSM-backed)', price_per_unit: 2.50, unit: 'Month', geography: 'Global', attributes: { security_type: 'KMS', scope: 'Regional' } },
  { provider: 'alibaba', service: 'Threat Detection', category: 'Network Security', instance_type: 'Security Center Advanced (per server)', price_per_unit: 23.50, unit: 'Month', geography: 'Global', attributes: { security_type: 'Threat Detection', scope: 'Global' } },

  // --- Cloudflare ---
  // Cloudflare runs a global edge network; security is its flagship offering.
  // Sources: cloudflare.com/plans, cloudflare.com/application-services/products/waf,
  // cloudflare.com/zero-trust, cloudflare.com/ddos.
  { provider: 'cloudflare', service: 'Web Application Firewall', category: 'Network Security', instance_type: 'WAF (Pro Plan)', price_per_unit: 20.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'WAF', scope: 'Global' } },
  { provider: 'cloudflare', service: 'DDoS Protection', category: 'Network Security', instance_type: 'Unmetered DDoS Mitigation', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'DDoS', scope: 'Global' } },
  { provider: 'cloudflare', service: 'Zero Trust', category: 'Identity & Encryption', instance_type: 'Access / Zero Trust (Per User)', price_per_unit: 7.00, unit: 'User/Month', geography: 'Global', attributes: { security_type: 'Zero Trust', scope: 'Global' } },
  { provider: 'cloudflare', service: 'SSL/TLS', category: 'Identity & Encryption', instance_type: 'Universal SSL (Free)', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'SSL/TLS', scope: 'Global' } },
  { provider: 'cloudflare', service: 'Bot Management', category: 'Network Security', instance_type: 'Bot Management (Enterprise)', price_per_unit: 0.00, unit: 'Custom', geography: 'Global', attributes: { security_type: 'Bot Management', scope: 'Global' } },

  // --- Secrets Management ---
  // AWS Secrets Manager
  { provider: 'aws', service: 'Secrets Manager', category: 'Secrets Management', instance_type: 'Per Secret', price_per_unit: 0.40, unit: 'Month', geography: 'Global', attributes: { security_type: 'Secrets Management', scope: 'Regional' } },
  { provider: 'aws', service: 'Secrets Manager', category: 'Secrets Management', instance_type: 'Per 10K API Calls', price_per_unit: 0.05, unit: '10K Calls', geography: 'Global', attributes: { security_type: 'Secrets Management', scope: 'Regional' } },

  // Azure Key Vault (Secrets capability)
  { provider: 'azure', service: 'Key Vault (Secrets)', category: 'Secrets Management', instance_type: 'Per Secret + Operations', price_per_unit: 0.03, unit: '10K Operations', geography: 'Global', attributes: { security_type: 'Secrets Management', scope: 'Regional' } },

  // GCP Secret Manager
  { provider: 'gcp', service: 'Secret Manager', category: 'Secrets Management', instance_type: 'Per Secret Active Version', price_per_unit: 0.06, unit: 'Month', geography: 'Global', attributes: { security_type: 'Secrets Management', scope: 'Regional' } },
  { provider: 'gcp', service: 'Secret Manager', category: 'Secrets Management', instance_type: 'Per 10K Access Operations', price_per_unit: 0.06, unit: '10K Operations', geography: 'Global', attributes: { security_type: 'Secrets Management', scope: 'Regional' } },

  // Oracle Vault (Secrets)
  { provider: 'oracle', service: 'Vault (Secrets)', category: 'Secrets Management', instance_type: 'Per Secret', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'Secrets Management', scope: 'Regional' } },

  // Alibaba Secret Manager
  { provider: 'alibaba', service: 'Secrets Manager', category: 'Secrets Management', instance_type: 'Per Secret', price_per_unit: 0.00, unit: 'Month', geography: 'Global', attributes: { security_type: 'Secrets Management', scope: 'Regional' } },
];

export class SecurityPricingPipeline {
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  async run() {
    console.log('🚀 Starting Security & Identity Pricing Pipeline...');
    const results: any[] = [];

    let recordsAdded = 0;

    await this.sql.begin(async (sql) => {
      // Clear existing static security data to avoid duplicates
      await sql`
        DELETE FROM pricing_records 
        WHERE data_source = 'static_config' 
        AND service_id IN (
          SELECT id FROM services WHERE category = 'security'
        )
      `;

      for (const record of STATIC_SECURITY_PRICING) {
        // Resolve provider id, auto-creating from config if not yet seeded.
        const providerId = await ensureProviderId(sql, record.provider);

        let serviceRes = await sql`SELECT id FROM services WHERE provider_id = ${providerId} AND name = ${record.service} AND category = 'security'`;
        let serviceId: string;

        if (serviceRes.length === 0) {
          const insertService = await sql`
            INSERT INTO services (provider_id, name, category) VALUES (${providerId}, ${record.service}, 'security') RETURNING id
          `;
          serviceId = insertService[0].id;
        } else {
          serviceId = serviceRes[0].id;
        }

        // Insert pricing record
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

    results.push({ provider: 'all_security', status: 'success', recordsProcessed: recordsAdded });
    console.log(`✅ Security & Identity Pricing Pipeline Completed. Inserted ${recordsAdded} records.`);
    return results;
  }
}
