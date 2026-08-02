/**
 * AWS Storage Pricing Configuration (Fallback)
 *
 * Prices are list, US East (N. Virginia), normalized to USD per GB-month for the
 * capacity dimension. Request/retrieval/IOPS costs (where applicable) are kept in
 * `attributes` for display, not in the headline price.
 *
 * storage_type: Object | Block | File | Archive
 * tier:         Standard | Infrequent | Cold
 * redundancy:   Single-Zone | Zone-Redundant | Geo-Redundant
 */
export const AWS_STORAGE_REGION = 'us-east-1';
export const AWS_STORAGE_GEOGRAPHY = 'N. America';

export const AWS_STORAGE = [
  { type: 'S3 Standard',            price: 0.023,   unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Standard',   redundancy: 'Zone-Redundant' } },
  { type: 'S3 Standard-IA',         price: 0.0125,  unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Infrequent', redundancy: 'Zone-Redundant', min_storage_duration_days: 30 } },
  { type: 'S3 One Zone-IA',         price: 0.01,    unit: 'GB-Month', attributes: { storage_type: 'Object',  tier: 'Infrequent', redundancy: 'Single-Zone',   min_storage_duration_days: 30 } },
  { type: 'S3 Glacier Flexible',    price: 0.0036,  unit: 'GB-Month', attributes: { storage_type: 'Archive', tier: 'Cold',       redundancy: 'Zone-Redundant', min_storage_duration_days: 90 } },
  { type: 'S3 Glacier Deep Archive',price: 0.00099, unit: 'GB-Month', attributes: { storage_type: 'Archive', tier: 'Cold',       redundancy: 'Zone-Redundant', min_storage_duration_days: 180 } },
  { type: 'EBS gp3',                price: 0.08,    unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'EBS io2',                price: 0.125,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'SSD' } },
  { type: 'EBS st1',                price: 0.045,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Standard',   redundancy: 'Single-Zone', media: 'HDD' } },
  { type: 'EBS sc1',                price: 0.015,   unit: 'GB-Month', attributes: { storage_type: 'Block',   tier: 'Infrequent', redundancy: 'Single-Zone', media: 'HDD' } },
  { type: 'EFS Standard',           price: 0.30,    unit: 'GB-Month', attributes: { storage_type: 'File',    tier: 'Standard',   redundancy: 'Zone-Redundant' } },
  { type: 'EFS Infrequent Access',  price: 0.016,   unit: 'GB-Month', attributes: { storage_type: 'File',    tier: 'Infrequent', redundancy: 'Zone-Redundant' } },
];
