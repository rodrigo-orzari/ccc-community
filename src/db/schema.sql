-- SQL Schema for Cloud Pricing Data

-- 1. Cloud Providers
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL, -- 'aws', 'gcp', 'azure', etc.
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cloud Regions
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL, -- 'us-east-1', 'europe-west1', etc.
    display_name VARCHAR(200),
    UNIQUE(provider_id, slug)
);

-- 3. Cloud Services
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- 'compute', 'storage', 'database', etc.
    UNIQUE(provider_id, name)
);

-- 4. Pricing Records
CREATE TABLE IF NOT EXISTS pricing_records (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    instance_type VARCHAR(100), -- 't3.medium', 'n1-standard-1', etc.
    vcpus FLOAT,
    memory_gb FLOAT,
    arch VARCHAR(50), -- 'x86_64', 'arm64'
    os VARCHAR(50), -- 'linux', 'windows'
    cpu_vendor VARCHAR(50), -- 'Intel', 'AMD', 'ARM', etc.
    gpu_count INTEGER DEFAULT 0,
    geography VARCHAR(100), -- 'N. America', 'Europe', etc.
    price_per_unit NUMERIC(15, 6) NOT NULL,
    unit VARCHAR(50) DEFAULT 'hourly',
    currency VARCHAR(10) DEFAULT 'USD',
    attributes JSONB, -- For extra metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prevents the same instance/region/os/arch variant from being inserted twice.
-- attributes->>'engine' and ->>'ha_mode' are included (COALESCE'd to '' so NULLs
-- don't exempt rows from the check) because database_pipeline.ts holds os/arch
-- constant across DB engines (MySQL, PostgreSQL, SQL Server, etc.) and HA modes —
-- those rows are only distinguished via the attributes JSONB, not real columns.
DROP INDEX IF EXISTS pricing_records_unique_key;

-- Remove duplicate rows before creating the unique index.
-- Keeps the first row (lowest id) of each duplicate group, deletes the rest.
-- This is a no-op if no duplicates exist.
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY service_id, region_id, instance_type, os, arch,
                   COALESCE(attributes->>'engine', ''),
                   COALESCE(attributes->>'ha_mode', '')
      ORDER BY id
    ) as rn
  FROM pricing_records
)
DELETE FROM pricing_records
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS pricing_records_unique_key
ON pricing_records (
    service_id, region_id, instance_type, os, arch,
    (COALESCE(attributes->>'engine', '')),
    (COALESCE(attributes->>'ha_mode', ''))
);

-- Performance indexes for the /api/pricing and /api/pricing/counts hot path.
-- Every request filters on s.category and joins pricing_records -> services -> providers,
-- then filters pricing_records by geography/os/arch/cpu_vendor/category (all wrapped in
-- LOWER()) plus JSONB attributes. Without these, Postgres sequential-scans pricing_records
-- on every request. All are IF NOT EXISTS so this block is safe to re-run.

-- Join / foreign-key columns (Postgres does NOT auto-index FKs).
CREATE INDEX IF NOT EXISTS idx_pricing_service_id ON pricing_records (service_id);
CREATE INDEX IF NOT EXISTS idx_pricing_region_id ON pricing_records (region_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services (category);

-- ORDER BY price_per_unit ASC on every query.
CREATE INDEX IF NOT EXISTS idx_pricing_price ON pricing_records (price_per_unit);

-- Functional indexes matching the LOWER(col) = ANY(...) filter predicates.
CREATE INDEX IF NOT EXISTS idx_pricing_geography_lower ON pricing_records (LOWER(geography));
CREATE INDEX IF NOT EXISTS idx_pricing_category_lower ON pricing_records (LOWER(category));
CREATE INDEX IF NOT EXISTS idx_pricing_os_lower ON pricing_records (LOWER(os));
CREATE INDEX IF NOT EXISTS idx_pricing_arch_lower ON pricing_records (LOWER(arch));
CREATE INDEX IF NOT EXISTS idx_pricing_cpu_vendor_lower ON pricing_records (LOWER(cpu_vendor));

-- GPU filtering (gpu_count > 0 / = 0).
CREATE INDEX IF NOT EXISTS idx_pricing_gpu_count ON pricing_records (gpu_count);

-- JSONB attributes: GIN supports the `?|` containment filters (e.g. serverless languages);
-- the expression index accelerates the very common engine = ANY(...) database/analytics filter.
CREATE INDEX IF NOT EXISTS idx_pricing_attributes_gin ON pricing_records USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_pricing_attr_engine_lower ON pricing_records (LOWER(attributes->>'engine'));

-- ===========================================================================
-- Premium capabilities: normalized pricing catalog
-- (Bring Your Estimate / Bring Your Bill)
--
-- pricing_records above remains the source of truth for the public comparison
-- site. The tables below are a normalized projection of it: specs stored once
-- per provider (sku_catalog) and prices stored per region (regional_prices).
-- This keeps row growth linear as we add regions instead of duplicating full
-- hardware metadata into every region.
--
-- The authoritative, re-runnable version of this block — including the
-- backfill from pricing_records — lives in src/db/migrations/001_premium_normalized_pricing.sql.
-- ===========================================================================

-- 5. Anchor regions and cross-provider geo grouping
ALTER TABLE regions ADD COLUMN IF NOT EXISTS is_anchor BOOLEAN DEFAULT FALSE;

-- geo_group maps provider-specific slugs onto a shared geography so the
-- matching engine can compare across clouds. Without it, a single region slug
-- only ever resolves for the one provider that owns it, and every other
-- provider returns a NULL price that renders as $0.00.
ALTER TABLE regions ADD COLUMN IF NOT EXISTS geo_group VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_regions_geo_group ON regions (geo_group);
CREATE INDEX IF NOT EXISTS idx_regions_is_anchor ON regions (is_anchor) WHERE is_anchor = TRUE;

-- 6. Regional fallback multipliers
-- region_slug is a plain string, not a FK: multipliers must be definable for
-- regions that have never been ingested, which is the point of a fallback.
CREATE TABLE IF NOT EXISTS regional_modifiers (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
    region_slug VARCHAR(100) NOT NULL,
    geo_group VARCHAR(50),
    multiplier NUMERIC(5, 4) DEFAULT 1.0000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, region_slug)
);

CREATE INDEX IF NOT EXISTS idx_regional_modifiers_lookup
  ON regional_modifiers (provider_id, region_slug);

-- 7. Normalized SKU catalog
CREATE TABLE IF NOT EXISTS sku_catalog (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    instance_type VARCHAR(100) NOT NULL,
    vcpus FLOAT,
    memory_gb FLOAT,
    arch VARCHAR(50) DEFAULT 'x86_64',
    os VARCHAR(50) DEFAULT 'linux',
    cpu_vendor VARCHAR(50),
    gpu_count INTEGER DEFAULT 0,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Uniqueness is a separate expression index, NOT an inline UNIQUE(...) table
-- constraint: PostgreSQL rejects expressions like COALESCE(attributes->>'engine','')
-- inside a table constraint. Same pattern as pricing_records_unique_key above.
CREATE UNIQUE INDEX IF NOT EXISTS sku_catalog_unique_key
ON sku_catalog (
    service_id, instance_type, os, arch,
    (COALESCE(attributes->>'engine', '')),
    (COALESCE(attributes->>'ha_mode', ''))
);

CREATE INDEX IF NOT EXISTS idx_sku_specs ON sku_catalog (os, vcpus, memory_gb);
CREATE INDEX IF NOT EXISTS idx_sku_service_id ON sku_catalog (service_id);
CREATE INDEX IF NOT EXISTS idx_sku_gpu_count ON sku_catalog (gpu_count);

-- 8. Regional prices
CREATE TABLE IF NOT EXISTS regional_prices (
    id SERIAL PRIMARY KEY,
    sku_id INTEGER REFERENCES sku_catalog(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    price_per_unit NUMERIC(15, 6) NOT NULL,
    unit VARCHAR(50) DEFAULT 'hourly',
    currency VARCHAR(10) DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sku_id, region_id)
);

CREATE INDEX IF NOT EXISTS idx_regional_prices_sku ON regional_prices (sku_id);
CREATE INDEX IF NOT EXISTS idx_regional_prices_region ON regional_prices (region_id);
CREATE INDEX IF NOT EXISTS idx_regional_prices_price ON regional_prices (price_per_unit);

-- 9. Feature usage counters ("Bring Your X" preview pages)
-- Tracks how many times each "Bring Your ___" upload feature has been run,
-- broken down by source provider — powers the "N estimates evaluated" style
-- counters on /bringyourestimate, /bringyourbill, etc. `feature` scopes the
-- table to more than one such counter without needing a table per feature.
CREATE TABLE IF NOT EXISTS feature_usage_counts (
    feature VARCHAR(30) NOT NULL,
    provider VARCHAR(30) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (feature, provider)
);

-- 10. Post-analysis feedback ("Bring Your X" preview pages)
-- One row per feedback prompt outcome — either a star rating (+ optional
-- comment) or a dismissal, distinguished by `dismissed`. Same `feature` key
-- as feature_usage_counts above so both counters stay consistent across
-- Estimate/Bill/Architecture. `rating`/`comment` are NULL on a dismissed row;
-- COUNT(*) WHERE dismissed = TRUE is how many people declined to rate.
CREATE TABLE IF NOT EXISTS feature_feedback (
    id SERIAL PRIMARY KEY,
    feature VARCHAR(30) NOT NULL,
    provider VARCHAR(30),
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Public API keys (/api/v1/*)
-- Only the SHA-256 hash of the key is stored — same principle as a password
-- table. The plaintext key is generated once, returned to the admin exactly
-- once at creation time (POST /api/admin/api-keys), and never stored or
-- logged again. `tier` selects the request-per-hour ceiling enforced in
-- src/lib/apiKeyAuth.ts; request_count/last_used_at are updated on every
-- authenticated call so usage is visible per key without a separate log table.
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    key_prefix VARCHAR(12) NOT NULL,
    label VARCHAR(100) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free',
    request_count BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash) WHERE revoked_at IS NULL;

-- 12. Catalog gaps — unmatched line items from "Bring Your X" cross-matching
-- (ccc-premium-services' crossReference.ts, NOT this repo — that service
-- reads this same database and is the only writer of this table).
--
-- A "gap" here means a source item that SHOULD have matched something (its
-- category is sold by every provider — compute, storage, database, ...) but
-- came back with zero results even after every relaxation rung (geography,
-- then engine, then service category) was exhausted. This is different from
-- `providerOnly` items with a genuine "no cross-cloud equivalent" reason
-- (support plans, proprietary services) — those are correct, not gaps, and
-- are NOT logged here. Distinguishing the two is what `reason` is for.
--
-- `feature` uses the same vocabulary as feature_usage_counts/feature_feedback
-- ('estimate', 'bill', 'architecture') so all three "Bring Your X" surfaces
-- funnel into one review queue instead of three separate ones — the matching
-- engine is shared code (crossReferenceEstimate), so this is one hook point,
-- not one per surface.
CREATE TABLE IF NOT EXISTS catalog_gaps (
    id SERIAL PRIMARY KEY,
    feature VARCHAR(30) NOT NULL,
    source_provider VARCHAR(30) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    detected_vcpus FLOAT,
    detected_memory_gb FLOAT,
    detected_os VARCHAR(50),
    detected_storage_gb FLOAT,
    region TEXT,
    geo_group VARCHAR(50),
    reason VARCHAR(30) NOT NULL DEFAULT 'no_match',
    -- Full crossReference item as JSON — belt-and-suspenders so a future
    -- review isn't blocked by a column this table didn't happen to have.
    raw_item JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_gaps_feature ON catalog_gaps (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_gaps_provider_category ON catalog_gaps (source_provider, category);

CREATE INDEX IF NOT EXISTS idx_feature_feedback_feature ON feature_feedback (feature);

-- Initial Data
-- Only pricing providers are seeded here. Other providers (Cloudflare, OpenAI,
-- vector DBs) are auto-created via ensureProviderId() when their pipelines
-- first run, so they don't need to be seeded.
INSERT INTO providers (slug, name) VALUES
('aws', 'AWS'),
('azure', 'Azure'),
('gcp', 'Google'),
('oracle', 'Oracle'),
('digitalocean', 'DigitalOcean'),
('alibaba', 'Alibaba Cloud')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
