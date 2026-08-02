// Data-access layer for the pricing dataset.
//
// WHY THIS EXISTS: every /api/pricing* and /api/health/status route used to build
// its own SQL inline and call sql.unsafe() directly — the route handler WAS the
// data layer, with HTTP concerns (query parsing, caching, JSON shaping) and SQL
// concerns (joins, filters, aggregation) tangled in one file. That made the
// dataset impossible to reuse from anywhere except an HTTP round-trip to itself.
//
// This module is step one of decoupling UI/HTTP from data: every function here
// takes plain parsed input and returns plain data — no NextRequest/NextResponse,
// no caching. A route handler's job is now just: parse the request, call one of
// these, shape the response. That split is also what makes a future public API
// (versioned, third-party-facing) or a separate service (e.g. Bring Your
// Architecture's matching engine) able to reuse this layer directly instead of
// re-deriving the same SQL, or calling back into this app over HTTP.
//
// Scope: the five read paths over pricing_records (pricing, counts, facets,
// filters, health/status). Admin mutation routes (fetch-pricing, init-db) and
// the workloads estimator are a separate concern and weren't touched here.

import sql from '../db';
import { buildPricingFilters } from '../api-utils';
import { normalizeTier } from '../../utils/tier_normalization';

export type PricingQuery = Record<string, string | undefined>;

const PRICING_SELECT = `
  p.name as provider,
  s.name as service,
  COALESCE(r.slug, 'global') as region,
  pr.instance_type,
  pr.vcpus,
  pr.memory_gb,
  pr.arch,
  pr.os,
  pr.cpu_vendor,
  pr.gpu_count,
  pr.geography,
  pr.price_per_unit,
  pr.previous_price_per_unit,
  pr.unit,
  pr.category,
  pr.attributes,
  pr.data_source,
  pr.updated_at
`;

const PRICING_SELECT_AGGREGATED = `
  p.name as provider,
  'Various' as service,
  'Various' as region,
  pr.instance_type,
  pr.vcpus,
  pr.memory_gb,
  pr.arch,
  pr.os,
  pr.cpu_vendor,
  pr.gpu_count,
  'Various' as geography,
  MIN(pr.price_per_unit) as min_price,
  AVG(pr.price_per_unit) as avg_price,
  MAX(pr.price_per_unit) as max_price,
  MIN(pr.price_per_unit) as price_per_unit,
  pr.unit,
  pr.category,
  MAX(pr.updated_at) as updated_at,
  MAX(pr.attributes::text)::jsonb as attributes,
  MAX(pr.data_source) as data_source
`;

/** Filtered pricing records, optionally aggregated (min/avg/max per SKU shape). */
export async function getPricingRecords(query: PricingQuery): Promise<any[]> {
  const isAggregated = query.aggregate === 'true';

  let dbQuery = `
    SELECT ${isAggregated ? PRICING_SELECT_AGGREGATED : PRICING_SELECT}
    FROM pricing_records pr
    JOIN services s ON pr.service_id = s.id
    LEFT JOIN regions r ON pr.region_id = r.id
    JOIN providers p ON s.provider_id = p.id
    WHERE 1=1
  `;

  const { whereClause, values } = buildPricingFilters(query);
  dbQuery += ' ' + whereClause;

  // Configurable limit (default 5000, max 5000 to prevent abuse).
  const rawLimit = query.limit ? parseInt(query.limit, 10) : 5000;
  const limit = Math.min(Math.max(rawLimit, 1), 5000);

  if (isAggregated) {
    dbQuery += `
      GROUP BY
        p.name, pr.instance_type, pr.vcpus, pr.memory_gb,
        pr.arch, pr.os, pr.cpu_vendor, pr.gpu_count, pr.category, pr.unit
      ORDER BY avg_price ASC
      LIMIT ${limit}
    `;
  } else {
    dbQuery += ` ORDER BY pr.price_per_unit ASC LIMIT ${limit}`;
  }

  const result = await sql.unsafe(dbQuery, values);

  // Normalize tier in attributes for consistent filtering.
  return result.map((row: any) => ({
    ...row,
    attributes: row.attributes ? {
      ...row.attributes,
      tier: row.attributes.tier ? normalizeTier(row.attributes.tier) : row.attributes.tier,
    } : row.attributes,
  }));
}

/** Per-provider record count for the currently active filters. */
export async function getPricingCounts(query: PricingQuery): Promise<{ slug: string; count: number }[]> {
  const { whereClause, values } = buildPricingFilters(query);

  // Aggregate matching records in a subquery, then LEFT JOIN providers to it so
  // EVERY provider is returned — including those with zero matches under the active
  // filters (count 0). Filtering directly in the outer WHERE would silently turn the
  // provider LEFT JOIN into an inner join and drop zero-count providers entirely.
  const dbQuery = `
    SELECT prov.slug, COALESCE(f.count, 0) AS count
    FROM providers prov
    LEFT JOIN (
      SELECT p.id AS provider_id, COUNT(pr.id) AS count
      FROM providers p
      JOIN services s ON s.provider_id = p.id
      JOIN pricing_records pr ON pr.service_id = s.id
      LEFT JOIN regions r ON pr.region_id = r.id
      WHERE 1=1 ${whereClause}
      GROUP BY p.id
    ) f ON f.provider_id = prov.id
    ORDER BY prov.slug
  `;
  return sql.unsafe(dbQuery, values) as unknown as Promise<{ slug: string; count: number }[]>;
}

// Per-option result counts for the filter sidebar ("AWS 1,840").
//
// Proper faceted-search semantics: each facet's counts are computed with every OTHER
// active filter applied, but WITHOUT that facet's own selection — otherwise checking
// "Oracle" would zero out the AWS row instead of showing what adding AWS would yield.
//
// To add a facet: add one row here. `param` is the query-string key that
// buildPricingFilters() reads; `expr` is the SQL expression whose distinct values are
// counted.
const FACETS: Record<string, { param: string; expr: string }> = {
  provider:   { param: 'provider',   expr: 'p.slug' },
  geography:  { param: 'geography',  expr: 'pr.geography' },
  os:         { param: 'os',         expr: 'pr.os' },
  arch:       { param: 'arch',       expr: 'pr.arch' },
  cpuVendor:  { param: 'cpuVendor',  expr: 'pr.cpu_vendor' },
  category:   { param: 'category',   expr: 'pr.category' },
  gpuModel:   { param: 'gpuModel',   expr: `pr.attributes->>'gpu_model'` },
  gpuVendor:  { param: 'gpuVendor',  expr: `pr.attributes->>'gpu_vendor'` },
  engines:    { param: 'engines',    expr: `pr.attributes->>'engine'` },
  haModes:    { param: 'haModes',    expr: `pr.attributes->>'ha_mode'` },
};

/** Per-facet option counts, each computed excluding that facet's own selection. */
export async function getFacetCounts(query: PricingQuery): Promise<Record<string, Record<string, number>>> {
  const entries = await Promise.all(
    Object.entries(FACETS).map(async ([key, { param, expr }]) => {
      const { [param]: _omit, ...rest } = query;
      const { whereClause, values } = buildPricingFilters(rest);

      const dbQuery = `
        SELECT ${expr} AS value, COUNT(pr.id)::int AS count
        FROM pricing_records pr
        JOIN services s ON pr.service_id = s.id
        JOIN providers p ON s.provider_id = p.id
        LEFT JOIN regions r ON pr.region_id = r.id
        WHERE 1=1 ${whereClause}
        GROUP BY ${expr}
      `;

      try {
        const rows = await sql.unsafe(dbQuery, values);
        const counts: Record<string, number> = {};
        for (const row of rows as any[]) {
          if (row.value === null || row.value === '') continue;
          counts[String(row.value)] = Number(row.count) || 0;
        }
        return [key, counts] as const;
      } catch (err) {
        // One bad facet shouldn't blank out every count in the sidebar.
        console.error(`Facet count failed for "${key}":`, err);
        return [key, {}] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

function normalizeArray(arr: string[] | null): string[] {
  if (!arr) return [];
  return [...new Set(arr.map(tier => normalizeTier(tier) as string))].sort();
}

/** Dynamic filter option lists (geographies, OS types, tiers, etc.) across the whole catalog. */
export async function getDynamicFilters(): Promise<Record<string, any>> {
  const query = `
    SELECT
      -- 'Global' is deliberately excluded from the selectable options: the query
      -- builder (buildPricingFilters in ../api-utils.ts) always force-includes
      -- 'global' rows alongside whatever region is selected (many services — data
      -- transfer, WAF, etc. — aren't tied to a region), so it's never actually
      -- excludable via this checkbox and only adds a non-functional option to the list.
      ARRAY_AGG(DISTINCT pr.geography) FILTER (WHERE pr.geography IS NOT NULL AND pr.geography != '' AND pr.geography != 'N/A' AND pr.geography != 'n/a' AND pr.geography != 'Global') as geographies,
      ARRAY_AGG(DISTINCT pr.geography) FILTER (WHERE pr.geography IS NOT NULL AND pr.geography != '' AND pr.geography != 'N/A' AND pr.geography != 'n/a' AND pr.geography != 'Global' AND s.category = 'security') as geographies_security,
      ARRAY_AGG(DISTINCT pr.geography) FILTER (WHERE pr.geography IS NOT NULL AND pr.geography != '' AND pr.geography != 'N/A' AND pr.geography != 'n/a' AND pr.geography != 'Global' AND s.category = 'data_warehouse') as geographies_analytics,
      ARRAY_AGG(DISTINCT pr.os) FILTER (WHERE pr.os IS NOT NULL AND pr.os != '' AND pr.os != 'N/A' AND pr.os != 'n/a') as os_types,
      ARRAY_AGG(DISTINCT pr.arch) FILTER (WHERE pr.arch IS NOT NULL AND pr.arch != '' AND pr.arch != 'N/A' AND pr.arch != 'n/a') as architectures,
      ARRAY_AGG(DISTINCT pr.cpu_vendor) FILTER (WHERE pr.cpu_vendor IS NOT NULL AND pr.cpu_vendor != '' AND pr.cpu_vendor != 'N/A' AND pr.cpu_vendor != 'n/a') as cpu_vendors,
      ARRAY_AGG(DISTINCT pr.category) FILTER (WHERE pr.category IS NOT NULL AND pr.category != '' AND s.category = 'compute' AND pr.gpu_count = 0) as categories,
      ARRAY_AGG(DISTINCT pr.attributes->>'gpu_model') FILTER (WHERE pr.attributes->>'gpu_model' IS NOT NULL AND s.category = 'compute' AND pr.gpu_count > 0) as gpu_models,
      ARRAY_AGG(DISTINCT pr.attributes->>'gpu_vendor') FILTER (WHERE pr.attributes->>'gpu_vendor' IS NOT NULL AND s.category = 'compute' AND pr.gpu_count > 0) as gpu_vendors,
      ARRAY_AGG(DISTINCT pr.category) FILTER (WHERE pr.category IS NOT NULL AND pr.category != '' AND s.category = 'database') as db_families,
      ARRAY_AGG(DISTINCT pr.category) FILTER (WHERE pr.category IS NOT NULL AND pr.category != '' AND s.category = 'networking') as networking_services,
      ARRAY_AGG(DISTINCT pr.category) FILTER (WHERE pr.category IS NOT NULL AND pr.category != '' AND s.category = 'storage') as storage_categories,
      ARRAY_AGG(DISTINCT pr.attributes->>'service_type') FILTER (WHERE pr.attributes->>'service_type' IS NOT NULL AND s.category = 'serverless') as serverless_service_types,
      ARRAY_AGG(DISTINCT pr.attributes->>'redundancy') FILTER (WHERE pr.attributes->>'redundancy' IS NOT NULL AND s.category = 'storage') as storage_redundancies,
      ARRAY_AGG(DISTINCT pr.attributes->>'media') FILTER (WHERE pr.attributes->>'media' IS NOT NULL AND s.category = 'storage') as storage_media,
      ARRAY_AGG(DISTINCT pr.attributes->>'tier') FILTER (WHERE pr.attributes->>'tier' IS NOT NULL AND s.category = 'storage') as storage_tiers,
      ARRAY_AGG(DISTINCT pr.attributes->>'tier') FILTER (WHERE pr.attributes->>'tier' IS NOT NULL AND s.category = 'app-hosting') as app_hosting_tiers,
      ARRAY_AGG(DISTINCT pr.attributes->>'compute_type') FILTER (WHERE pr.attributes->>'compute_type' IS NOT NULL AND s.category = 'app-hosting') as app_hosting_compute_types,
      ARRAY_AGG(DISTINCT pr.attributes->>'engine') FILTER (WHERE pr.attributes->>'engine' IS NOT NULL) as engines,
      ARRAY_AGG(DISTINCT pr.attributes->>'deployment_type') FILTER (WHERE pr.attributes->>'deployment_type' IS NOT NULL) as deployment_types,
      ARRAY_AGG(DISTINCT pr.attributes->>'ha_mode') FILTER (WHERE pr.attributes->>'ha_mode' IS NOT NULL) as ha_modes,
      ARRAY_AGG(DISTINCT pr.attributes->>'tier') FILTER (WHERE pr.attributes->>'tier' IS NOT NULL AND s.category = 'data_warehouse') as tiers,
      ARRAY_AGG(DISTINCT pr.attributes->>'modelTier') FILTER (WHERE pr.attributes->>'modelTier' IS NOT NULL) as ai_model_tiers,
      ARRAY_AGG(DISTINCT pr.attributes->>'modality') FILTER (WHERE pr.attributes->>'modality' IS NOT NULL) as ai_modalities,
      -- Normalized: rows carry either boolean true/false (scraped) or 'Yes'/'No'
      -- (static config), which surfaced as four options for a two-value concept.
      -- INITCAP gives 'Yes'/'No' to match AI_MULTIMODAL_OPTIONS; the predicate in
      -- api-utils.boolAttrSql lowercases both sides, so the two agree.
      ARRAY_AGG(DISTINCT INITCAP(
        CASE LOWER(pr.attributes->>'multimodal')
          WHEN 'true'  THEN 'yes'
          WHEN 'false' THEN 'no'
          ELSE LOWER(pr.attributes->>'multimodal')
        END
      )) FILTER (WHERE pr.attributes->>'multimodal' IS NOT NULL) as ai_multimodal,
      ARRAY_AGG(DISTINCT pr.attributes->>'orchestrator') FILTER (WHERE pr.attributes->>'orchestrator' IS NOT NULL) as orchestrators,
      ARRAY_AGG(DISTINCT pr.attributes->>'compute_type') FILTER (WHERE pr.attributes->>'compute_type' IS NOT NULL) as container_compute_types,
      ARRAY_AGG(DISTINCT pr.attributes->>'architecture') FILTER (WHERE pr.attributes->>'architecture' IS NOT NULL) as container_architectures,
      ARRAY_AGG(DISTINCT pr.attributes->>'billing_granularity') FILTER (WHERE pr.attributes->>'billing_granularity' IS NOT NULL) as billing_granularities,
      ARRAY_AGG(DISTINCT pr.attributes->>'execution_model') FILTER (WHERE pr.attributes->>'execution_model' IS NOT NULL) as execution_models,
      ARRAY_AGG(DISTINCT pr.attributes->>'provisioned_concurrency_support') FILTER (WHERE pr.attributes->>'provisioned_concurrency_support' IS NOT NULL) as provisioned_concurrency,
      ARRAY_AGG(DISTINCT pr.attributes->>'usage_tier') FILTER (WHERE pr.attributes->>'usage_tier' IS NOT NULL) as usage_tiers,
      ARRAY_AGG(DISTINCT pr.attributes->>'transfer_scope') FILTER (WHERE pr.attributes->>'transfer_scope' IS NOT NULL) as transfer_scopes
    FROM pricing_records pr
    LEFT JOIN services s ON s.id = pr.service_id;
  `;

  // Serverless supportedLanguages is an array, we unnest and aggregate separately.
  const langQuery = `
    SELECT ARRAY_AGG(DISTINCT lang) as serverless_languages
    FROM pricing_records, jsonb_array_elements_text(CASE WHEN jsonb_typeof(attributes->'supportedLanguages') = 'array' THEN attributes->'supportedLanguages' ELSE '[]'::jsonb END) as lang
    WHERE attributes->'supportedLanguages' IS NOT NULL
  `;

  const [mainResult] = await sql.unsafe(query);
  const [langResult] = await sql.unsafe(langQuery);

  return {
    ...mainResult,
    storage_tiers: normalizeArray(mainResult.storage_tiers),
    app_hosting_tiers: normalizeArray(mainResult.app_hosting_tiers),
    tiers: normalizeArray(mainResult.tiers),
    serverless_languages: langResult?.serverless_languages || [],
  };
}

export interface HealthSnapshot {
  total_records: number;
  by_provider: { slug: string; count: number }[];
  last_updated: Date | null;
}

/** Record count (overall + per provider) and last-ingest timestamp for the active filters. */
export async function getHealthSnapshot(query: PricingQuery): Promise<HealthSnapshot> {
  const { whereClause, values } = buildPricingFilters(query);

  const countRes = await sql.unsafe(
    `SELECT COUNT(*) FROM pricing_records pr JOIN services s ON pr.service_id = s.id LEFT JOIN regions r ON pr.region_id = r.id WHERE 1=1 ${whereClause}`,
    values
  );
  const providerRes = await sql.unsafe(`
    SELECT p.slug, COUNT(pr.id) as count
    FROM providers p
    LEFT JOIN services s ON s.provider_id = p.id
    LEFT JOIN pricing_records pr ON pr.service_id = s.id
    LEFT JOIN regions r ON pr.region_id = r.id
    WHERE 1=1 ${whereClause}
    GROUP BY p.slug
  `, values);
  const [lastUpdatedRow] = await sql.unsafe('SELECT MAX(updated_at) as last_updated FROM pricing_records');

  return {
    total_records: parseInt(countRes[0].count, 10),
    by_provider: providerRes as unknown as { slug: string; count: number }[],
    last_updated: lastUpdatedRow.last_updated,
  };
}
