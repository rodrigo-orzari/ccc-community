/**
 * Google Cloud Storage Pricing Configuration (Fallback)
 * List prices, us-central1 (regional) / US multi-region, USD per GB-month.
 * storage_type: Object | Block | File | Archive · tier: Standard | Infrequent | Cold
 * redundancy: Single-Zone (zonal) | Zone-Redundant (regional) | Geo-Redundant (multi-region)
 */
export const GCP_STORAGE_REGION = 'us-central1';
export const GCP_STORAGE_GEOGRAPHY = 'N. America';

export const GCP_STORAGE = [
  { type: 'Cloud Storage Standard (Regional)',     price: 0.020,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Zone-Redundant' } },
  { type: 'Cloud Storage Standard (Multi-Region)', price: 0.026,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Geo-Redundant' } },
  { type: 'Cloud Storage Nearline',                price: 0.010,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Infrequent', redundancy: 'Zone-Redundant', min_storage_duration_days: 30 } },
  { type: 'Cloud Storage Coldline',                price: 0.004,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Cold',       redundancy: 'Zone-Redundant', min_storage_duration_days: 90 } },
  { type: 'Cloud Storage Archive',                 price: 0.0012, unit: 'GB-Month', attributes: { storage_type: 'Archive', tier: 'Cold',       redundancy: 'Zone-Redundant', min_storage_duration_days: 365 } },
  { type: 'Persistent Disk SSD',                   price: 0.17,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Persistent Disk Balanced',              price: 0.10,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Persistent Disk Standard',              price: 0.04,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'HDD' } },
  { type: 'Filestore Basic HDD',                   price: 0.20,   unit: 'GB-Month', attributes: { storage_type: 'File',    tier: 'Standard',   redundancy: 'Zone-Redundant', media: 'HDD' } },
  { type: 'Filestore Basic SSD',                   price: 0.30,   unit: 'GB-Month', attributes: { storage_type: 'File',    tier: 'Standard',   redundancy: 'Zone-Redundant', media: 'SSD' } },
];
