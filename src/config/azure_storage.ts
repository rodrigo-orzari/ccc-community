/**
 * Azure Storage Pricing Configuration (Fallback)
 * List prices, East US, USD per GB-month capacity.
 * storage_type: Object | Block | File | Archive · tier: Standard | Infrequent | Cold
 * redundancy: Single-Zone (LRS) | Zone-Redundant (ZRS) | Geo-Redundant (GRS)
 */
export const AZURE_STORAGE_REGION = 'eastus';
export const AZURE_STORAGE_GEOGRAPHY = 'N. America';

export const AZURE_STORAGE = [
  { type: 'Blob Hot (LRS)',          price: 0.018,   unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Single-Zone' } },
  { type: 'Blob Hot (ZRS)',          price: 0.0225,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Zone-Redundant' } },
  { type: 'Blob Hot (GRS)',          price: 0.036,   unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Geo-Redundant' } },
  { type: 'Blob Cool (LRS)',         price: 0.010,   unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Infrequent', redundancy: 'Single-Zone', min_storage_duration_days: 30 } },
  { type: 'Blob Archive (LRS)',      price: 0.00099, unit: 'GB-Month', attributes: { storage_type: 'Archive', tier: 'Cold',       redundancy: 'Single-Zone', min_storage_duration_days: 180 } },
  { type: 'Managed Disk Premium SSD',price: 0.135,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Managed Disk Standard SSD',price: 0.075,  unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'Managed Disk Standard HDD',price: 0.045,  unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'HDD' } },
  { type: 'Azure Files Premium',     price: 0.16,    unit: 'GB-Month', attributes: { storage_type: 'File',    tier: 'Standard',   redundancy: 'Zone-Redundant', media: 'SSD' } },
  { type: 'Azure Files (Transaction Optimized)', price: 0.06, unit: 'GB-Month', attributes: { storage_type: 'File', tier: 'Standard', redundancy: 'Single-Zone', media: 'HDD' } },
];
