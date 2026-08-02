/**
 * Oracle Cloud (OCI) Storage Pricing Configuration (Fallback)
 * List prices, us-ashburn-1, USD per GB-month.
 * storage_type: Object | Block | File | Archive · tier: Standard | Infrequent | Cold
 */
export const ORACLE_STORAGE_REGION = 'us-ashburn-1';
export const ORACLE_STORAGE_GEOGRAPHY = 'N. America';

export const ORACLE_STORAGE = [
  { type: 'Object Storage Standard',          price: 0.0255, unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Zone-Redundant' } },
  { type: 'Object Storage Infrequent Access', price: 0.010,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Infrequent', redundancy: 'Zone-Redundant', min_storage_duration_days: 31 } },
  { type: 'Archive Storage',                  price: 0.0026, unit: 'GB-Month', attributes: { storage_type: 'Archive', tier: 'Cold',       redundancy: 'Zone-Redundant', min_storage_duration_days: 90 } },
  { type: 'Block Volume Balanced',            price: 0.0255, unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Block Volume Higher Performance',  price: 0.0425, unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Block Volume Lower Cost',          price: 0.0153, unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Infrequent', redundancy: 'Single-Zone', media: 'HDD' } },
  { type: 'File Storage',                     price: 0.085,  unit: 'GB-Month', attributes: { storage_type: 'File',    tier: 'Standard',   redundancy: 'Zone-Redundant' } },
];
