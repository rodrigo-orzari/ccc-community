/**
 * Tier Normalization Utility
 * Maps provider-specific tier names to canonical tier categories for consistent filtering
 */

export const TIER_CATEGORIES = {
  ENTERPRISE: 'Enterprise',
  PREMIUM: 'Premium',
  STANDARD: 'Standard',
  BASIC: 'Basic',
  FREE: 'Free',
} as const;

export type TierCategory = typeof TIER_CATEGORIES[keyof typeof TIER_CATEGORIES];

/**
 * Comprehensive mapping of provider-specific tier names to canonical categories
 * Supports Azure, AWS, GCP, Oracle, DigitalOcean, and Alibaba tier naming conventions
 */
const TIER_MAPPING: Record<string, TierCategory> = {
  // Azure SQL Database tiers
  'Business Critical': TIER_CATEGORIES.ENTERPRISE,
  'Enterprise': TIER_CATEGORIES.ENTERPRISE,
  'Enterprise Edition': TIER_CATEGORIES.ENTERPRISE,
  'Enterprise Plus': TIER_CATEGORIES.ENTERPRISE,
  'Premium': TIER_CATEGORIES.PREMIUM,
  'GeneralPurpose': TIER_CATEGORIES.STANDARD,
  'Standard': TIER_CATEGORIES.STANDARD,
  'Standard Edition': TIER_CATEGORIES.STANDARD,
  'Burstable': TIER_CATEGORIES.BASIC,
  'Basic': TIER_CATEGORIES.BASIC,
  'Serverless': TIER_CATEGORIES.STANDARD,

  // AWS RDS tiers
  'db.r6i': TIER_CATEGORIES.ENTERPRISE, // Memory optimized (db.r = enterprise-grade)
  'db.x1': TIER_CATEGORIES.ENTERPRISE,
  'db.x2': TIER_CATEGORIES.ENTERPRISE,
  'db.m6i': TIER_CATEGORIES.PREMIUM, // General purpose (db.m = mid-range)
  'db.m5': TIER_CATEGORIES.PREMIUM,
  'db.t3': TIER_CATEGORIES.STANDARD, // Burstable (db.t = standard)
  'db.t4g': TIER_CATEGORIES.STANDARD,

  // GCP Cloud SQL tiers
  'db-custom': TIER_CATEGORIES.ENTERPRISE,
  'db-n1-highmem': TIER_CATEGORIES.ENTERPRISE,
  'db-n1-standard': TIER_CATEGORIES.PREMIUM,
  'db-f1-micro': TIER_CATEGORIES.BASIC,
  'db-g1-small': TIER_CATEGORIES.BASIC,

  // Oracle Database tiers
  'Always Free': TIER_CATEGORIES.FREE,
  'Autonomous Premium': TIER_CATEGORIES.ENTERPRISE,
  'Autonomous Enterprise': TIER_CATEGORIES.ENTERPRISE,
  'Autonomous Standard': TIER_CATEGORIES.STANDARD,

  // DigitalOcean Database tiers
  // 'Basic' is already mapped
  // 'Professional' is already mapped below
  // 'Premium' conflicts with Azure, defaulting to PREMIUM

  // Alibaba Cloud Database tiers
  // 'Enterprise' is already mapped
  'High-availability': TIER_CATEGORIES.PREMIUM,
  // 'Basic' is already mapped

  // Redis/Cache tiers (Azure)
  'Basic Cache': TIER_CATEGORIES.BASIC,
  'Standard Cache': TIER_CATEGORIES.STANDARD,
  'Premium Cache': TIER_CATEGORIES.PREMIUM,
  'Enterprise Cache': TIER_CATEGORIES.ENTERPRISE,
  'Enterprise Flash Cache': TIER_CATEGORIES.ENTERPRISE,

  // Generic patterns that might appear
  'Free': TIER_CATEGORIES.FREE,
  'Starter': TIER_CATEGORIES.BASIC,
  'Professional': TIER_CATEGORIES.PREMIUM,
};

/**
 * Normalize a provider-specific tier name to a canonical category
 * If no mapping exists, attempts pattern matching or returns the original tier
 * @param tierName The provider-specific tier name
 * @returns The normalized tier category or original tier name if unmapped
 */
export function normalizeTier(tierName: string | null | undefined): TierCategory | string {
  if (!tierName) return TIER_CATEGORIES.STANDARD;

  // Direct lookup
  if (tierName in TIER_MAPPING) {
    return TIER_MAPPING[tierName];
  }

  // Case-insensitive lookup
  const lowerTier = tierName.toLowerCase();
  for (const [key, value] of Object.entries(TIER_MAPPING)) {
    if (key.toLowerCase() === lowerTier) {
      return value;
    }
  }

  // Pattern matching for AWS instance types
  if (tierName.startsWith('db.')) {
    const instanceFamily = tierName.split('.')[1]?.[0] || '';
    if (instanceFamily === 'r' || instanceFamily === 'x') return TIER_CATEGORIES.ENTERPRISE;
    if (instanceFamily === 'm') return TIER_CATEGORIES.PREMIUM;
    if (instanceFamily === 't') return TIER_CATEGORIES.STANDARD;
  }

  // Pattern matching for GCP
  if (tierName.includes('highmem')) return TIER_CATEGORIES.ENTERPRISE;
  if (tierName.includes('standard')) return TIER_CATEGORIES.PREMIUM;
  if (tierName.includes('micro') || tierName.includes('small')) return TIER_CATEGORIES.BASIC;

  // Pattern matching: if it contains 'enterprise', treat as enterprise
  if (lowerTier.includes('enterprise')) return TIER_CATEGORIES.ENTERPRISE;
  if (lowerTier.includes('premium')) return TIER_CATEGORIES.PREMIUM;
  if (lowerTier.includes('standard')) return TIER_CATEGORIES.STANDARD;
  if (lowerTier.includes('basic') || lowerTier.includes('starter')) return TIER_CATEGORIES.BASIC;
  if (lowerTier.includes('free')) return TIER_CATEGORIES.FREE;

  // Default to the original tier name if no match
  return tierName;
}

/**
 * Get all recognized tier categories
 */
export function getAllTierCategories(): TierCategory[] {
  return Object.values(TIER_CATEGORIES);
}
