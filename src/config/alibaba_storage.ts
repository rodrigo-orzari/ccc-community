/**
 * Alibaba Cloud Storage Pricing Configuration (Fallback)
 * List prices, us-west-1 (Silicon Valley), USD per GB-month.
 * storage_type: Object | Block | File | Archive · tier: Standard | Infrequent | Cold
 */
export const ALIBABA_STORAGE_REGION = 'us-west-1';
export const ALIBABA_STORAGE_GEOGRAPHY = 'N. America';

export const ALIBABA_STORAGE = [
  { type: 'OSS Standard (LRS)',        price: 0.018,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Single-Zone' } },
  { type: 'OSS Standard (ZRS)',        price: 0.0225, unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Zone-Redundant' } },
  { type: 'OSS Infrequent Access',     price: 0.009,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Infrequent', redundancy: 'Single-Zone', min_storage_duration_days: 30 } },
  { type: 'OSS Archive',               price: 0.0033, unit: 'GB-Month', attributes: { storage_type: 'Archive', tier: 'Cold',       redundancy: 'Single-Zone', min_storage_duration_days: 60 } },
  { type: 'OSS Cold Archive',          price: 0.0018, unit: 'GB-Month', attributes: { storage_type: 'Archive', tier: 'Cold',       redundancy: 'Single-Zone', min_storage_duration_days: 180 } },
  { type: 'ESSD (Block)',              price: 0.14,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Standard SSD (Block)',      price: 0.05,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Ultra Disk (Block)',        price: 0.05,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'HDD' } },
  { type: 'NAS File Storage',          price: 0.10,   unit: 'GB-Month', attributes: { storage_type: 'File',    tier: 'Standard',   redundancy: 'Zone-Redundant' } },
];
