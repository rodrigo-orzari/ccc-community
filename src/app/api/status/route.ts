import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

const PIPELINE_DISPLAY: Record<string, string> = {
  vm: 'Virtual Machines',
  gpu: 'GPUs',
  database: 'Databases',
  serverless: 'Serverless',
  containers: 'Containers',
  networking: 'Networking',
  'data-analytics': 'Data & Analytics',
  ai: 'AI & Machine Learning',
  storage: 'Storage',
  'app-hosting': 'App Hosting',
  integration: 'Integration',
  security: 'Security & Identity',
};

export async function GET() {
  try {
    // Per-provider, per-pipeline breakdown with data_source split
    const rows = await sql`
      SELECT
        p.name            AS provider_name,
        p.slug,
        CASE
          WHEN s.category = 'compute' THEN 'vm'
          WHEN s.category = 'data_warehouse' THEN 'data-analytics'
          ELSE s.category
        END AS pipeline,
        COUNT(pr.id)::int AS record_count,
        MAX(pr.updated_at) AS last_updated,
        SUM(CASE WHEN pr.data_source = 'static_config' THEN 1 ELSE 0 END)::int AS static_count,
        SUM(CASE WHEN pr.data_source IS DISTINCT FROM 'static_config' THEN 1 ELSE 0 END)::int AS api_count
      FROM providers p
      LEFT JOIN services s ON s.provider_id = p.id
      LEFT JOIN pricing_records pr ON pr.service_id = s.id
      GROUP BY p.name, p.slug, 
        CASE
          WHEN s.category = 'compute' THEN 'vm'
          WHEN s.category = 'data_warehouse' THEN 'data-analytics'
          ELSE s.category
        END
      ORDER BY p.name, pipeline
    `;

    // Global totals
    const totalsRes = await sql`
      SELECT
        COUNT(*)::int        AS total_records,
        MAX(updated_at)      AS last_ingested,
        SUM(CASE WHEN data_source = 'static_config' THEN 1 ELSE 0 END)::int AS total_static,
        SUM(CASE WHEN data_source IS DISTINCT FROM 'static_config' THEN 1 ELSE 0 END)::int AS total_api
      FROM pricing_records
    `;
    const totals = totalsRes[0];

    // Premium catalog health (sku_catalog / regional_prices).
    //
    // These tables are a normalized projection of pricing_records, written by
    // the same ingestion run. They can silently fall behind — if the projection
    // write fails while the pricing_records insert succeeds, the counts above
    // stay perfectly healthy while Bring Your Estimate serves stale prices with
    // no visible symptom. staleness_hours is the gap between the newest
    // pricing_record and the newest regional_price, which is the signal that
    // matters: a growing gap means the projection stopped keeping up.
    //
    // Wrapped in its own try/catch so a pre-migration database (where these
    // tables don't exist yet) degrades to null instead of 500-ing the whole
    // status page.
    let premiumCatalog: {
      sku_count: number;
      price_count: number;
      anchor_region_count: number;
      last_updated: string | null;
      staleness_hours: number | null;
    } | null = null;

    // Short machine-readable reason when the block above fails. Deliberately a
    // fixed vocabulary rather than the raw driver message — the endpoint is
    // public, and raw errors leak schema and connection detail.
    let premiumCatalogError: string | null = null;

    try {
      const premiumRes = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM sku_catalog)                        AS sku_count,
          (SELECT COUNT(*)::int FROM regional_prices)                    AS price_count,
          (SELECT COUNT(*)::int FROM regions WHERE is_anchor)            AS anchor_region_count,
          (SELECT MAX(updated_at) FROM regional_prices)                  AS last_updated,
          EXTRACT(EPOCH FROM (
            (SELECT MAX(updated_at) FROM pricing_records)
            - (SELECT MAX(updated_at) FROM regional_prices)
          )) / 3600                                                      AS staleness_hours
      `;
      const pc = premiumRes[0];
      premiumCatalog = {
        sku_count: Number(pc.sku_count) || 0,
        price_count: Number(pc.price_count) || 0,
        anchor_region_count: Number(pc.anchor_region_count) || 0,
        last_updated: pc.last_updated ? (pc.last_updated as Date).toISOString() : null,
        staleness_hours: pc.staleness_hours == null ? null : Number(pc.staleness_hours),
      };
    } catch (premiumErr: any) {
      // Swallowing this silently made the failure undiagnosable in production:
      // the endpoint returned premium_catalog: null with no indication whether
      // the tables were missing, permissions were denied, or the query was
      // malformed. Classify the cause so it can be read straight off the API.
      const msg = String(premiumErr?.message ?? premiumErr);
      const code = premiumErr?.code as string | undefined;

      if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
        // Table missing — this database has not had migration 001 applied.
        premiumCatalogError = 'tables_missing';
      } else if (code === '42501' || /permission denied/i.test(msg)) {
        premiumCatalogError = 'permission_denied';
      } else if (code === '42703' || /column .* does not exist/i.test(msg)) {
        // e.g. regions.is_anchor absent — partial migration.
        premiumCatalogError = 'column_missing';
      } else {
        premiumCatalogError = 'query_failed';
      }

      console.warn(`Premium catalog status unavailable (${premiumCatalogError}) [${code ?? 'no code'}]:`, msg);
    }

    // Group rows by provider
    const providerMap: Record<string, any> = {};
    for (const row of rows) {
      const slug = row.slug as string;
      if (!providerMap[slug]) {
        providerMap[slug] = {
          name: row.provider_name,
          slug,
          total_records: 0,
          last_updated: null as string | null,
          pipelines: [] as any[],
        };
      }
      const p = providerMap[slug];

      const count = Number(row.record_count) || 0;
      const staticCount = Number(row.static_count) || 0;
      const apiCount = Number(row.api_count) || 0;
      const lastUpdated = row.last_updated ? (row.last_updated as Date).toISOString() : null;

      p.total_records += count;
      if (lastUpdated && (!p.last_updated || lastUpdated > p.last_updated)) {
        p.last_updated = lastUpdated;
      }

      if (row.pipeline) {
        let sourceLabel: 'api' | 'static' | 'mixed' | 'none' = 'none';
        if (count === 0) sourceLabel = 'none';
        else if (apiCount > 0 && staticCount === 0) sourceLabel = 'api';
        else if (staticCount > 0 && apiCount === 0) sourceLabel = 'static';
        else sourceLabel = 'mixed';

        p.pipelines.push({
          category: row.pipeline,
          display_name: PIPELINE_DISPLAY[row.pipeline as string] ?? row.pipeline,
          record_count: count,
          api_count: apiCount,
          static_count: staticCount,
          last_updated: lastUpdated,
          data_source: sourceLabel,
        });
      }
    }

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      last_ingested: totals.last_ingested ? (totals.last_ingested as Date).toISOString() : null,
      total_records: Number(totals.total_records) || 0,
      total_api_records: Number(totals.total_api) || 0,
      total_static_records: Number(totals.total_static) || 0,
      premium_catalog: premiumCatalog,
      premium_catalog_error: premiumCatalogError,
      providers: Object.values(providerMap),
    });
  } catch (err: any) {
    console.error('Status API error:', err);
    return NextResponse.json({ error: 'Failed to fetch status', details: err.message }, { status: 500 });
  }
}
