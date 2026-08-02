/**
 * Normalized pricing writes for the Premium capabilities
 * (Bring Your Estimate / Bring Your Bill).
 *
 * pricing_records stays the source of truth for the public comparison site.
 * This module maintains a normalized projection of it:
 *
 *   sku_catalog     - hardware/service specs, stored once per provider
 *   regional_prices - unit cost per SKU per region
 *
 * Why normalized: hardware metadata (vCPU, RAM, arch, OS, CPU vendor, GPU
 * count, attributes) is identical across every region a SKU is sold in.
 * Storing it per region multiplies row count by the region count. Splitting
 * specs from prices keeps growth linear as anchor regions are added.
 *
 * NOTE ON DB CLIENT: this codebase uses postgres.js (tagged templates), not
 * node-postgres. Values are interpolated via ${} in the template, not $1/$2
 * placeholders, and results are returned as plain arrays rather than
 * { rows: [...] }.
 */

type Sql = any;

export interface NormalizedPricingRecord {
  serviceId: number;
  regionId: number;
  instanceType: string;
  vcpus?: number | null;
  memoryGb?: number | null;
  arch?: string | null;
  os?: string | null;
  cpuVendor?: string | null;
  gpuCount?: number | null;
  attributes?: Record<string, any> | null;
  pricePerUnit: number;
  unit?: string | null;
  currency?: string | null;
}

/**
 * Returns the anchor region slugs for a provider.
 *
 * Anchor regions are the major pricing hubs we fetch live. Everything else
 * falls back to an anchor price scaled by regional_modifiers.multiplier.
 *
 * Callers must treat an empty result as "no anchor configured — ingest all
 * regions" rather than "ingest nothing". Silently skipping a provider because
 * its anchors were never seeded would drop it from the catalog entirely, which
 * is exactly what the original anchor slug list did to Oracle and DigitalOcean.
 */
export async function getAnchorRegions(sql: Sql, providerSlug: string): Promise<string[]> {
  const rows = await sql`
    SELECT r.slug
    FROM regions r
    JOIN providers p ON r.provider_id = p.id
    WHERE p.slug = ${providerSlug} AND r.is_anchor = TRUE
  `;
  return rows.map((row: any) => row.slug);
}

/**
 * Returns the geo_group for a provider region, or null if unmapped.
 * Used by the premium matching engine to compare like geographies across
 * providers that name the same location differently.
 */
export async function getGeoGroup(sql: Sql, providerSlug: string, regionSlug: string): Promise<string | null> {
  const rows = await sql`
    SELECT r.geo_group
    FROM regions r
    JOIN providers p ON r.provider_id = p.id
    WHERE p.slug = ${providerSlug} AND r.slug = ${regionSlug}
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].geo_group : null;
}

/**
 * Two-step write: upsert the SKU spec, then upsert its regional price.
 *
 * Both steps are upserts rather than delete-and-reinsert. regional_prices
 * carries an ON DELETE CASCADE FK to sku_catalog, so deleting SKUs between
 * runs would wipe prices and churn the surrogate ids on every ingestion.
 */
export async function saveNormalizedPricing(sql: Sql, record: NormalizedPricingRecord): Promise<number> {
  const attrs = record.attributes && Object.keys(record.attributes).length > 0 ? record.attributes : null;

  const skuRows = await sql`
    INSERT INTO sku_catalog (service_id, instance_type, vcpus, memory_gb, os, arch, cpu_vendor, gpu_count, attributes)
    VALUES (
      ${record.serviceId},
      ${record.instanceType},
      ${record.vcpus ?? null},
      ${record.memoryGb ?? null},
      ${record.os ?? 'linux'},
      ${record.arch ?? 'x86_64'},
      ${record.cpuVendor ?? null},
      ${record.gpuCount ?? 0},
      ${attrs ? sql.json(attrs) : null}
    )
    ON CONFLICT (service_id, instance_type, os, arch,
                 (COALESCE(attributes->>'engine', '')),
                 (COALESCE(attributes->>'ha_mode', '')))
    DO UPDATE SET
      vcpus = EXCLUDED.vcpus,
      memory_gb = EXCLUDED.memory_gb,
      cpu_vendor = EXCLUDED.cpu_vendor,
      gpu_count = EXCLUDED.gpu_count
    RETURNING id
  `;

  const skuId = skuRows[0].id;

  await sql`
    INSERT INTO regional_prices (sku_id, region_id, price_per_unit, unit, currency)
    VALUES (
      ${skuId},
      ${record.regionId},
      ${record.pricePerUnit},
      ${record.unit ?? 'hourly'},
      ${record.currency ?? 'USD'}
    )
    ON CONFLICT (sku_id, region_id)
    DO UPDATE SET
      price_per_unit = EXCLUDED.price_per_unit,
      unit = EXCLUDED.unit,
      currency = EXCLUDED.currency,
      updated_at = CURRENT_TIMESTAMP
  `;

  return skuId;
}

/**
 * Batch variant used by the pipelines. Deduplicates on the sku_catalog unique
 * key before writing so a single colliding pair from a provider feed cannot
 * abort the whole batch with a 23505.
 */
export async function saveNormalizedPricingBatch(
  sql: Sql,
  records: NormalizedPricingRecord[]
): Promise<{ skus: number; prices: number; skipped: number }> {
  if (records.length === 0) return { skus: 0, prices: 0, skipped: 0 };

  const seen = new Set<string>();
  let skipped = 0;
  const deduped = records.filter(r => {
    const a = r.attributes ?? {};
    const key = [
      r.serviceId, r.regionId, r.instanceType,
      r.os ?? 'linux', r.arch ?? 'x86_64',
      (a as any).engine ?? '', (a as any).ha_mode ?? ''
    ].join('|');
    if (seen.has(key)) { skipped++; return false; }
    seen.add(key);
    return true;
  });

  const skuIds = new Set<number>();
  let prices = 0;

  // Bulk upsert in chunks — two round trips per chunk (one for sku_catalog,
  // one for regional_prices) instead of two round trips per row. The old
  // per-row loop turned a few thousand normalized rows into many minutes of
  // sequential latency against a remote DB (confirmed 2026-07-24, DO
  // Postgres over TLS). Chunk size matches the pricing_records batch insert
  // above (postgres.js's 65,534-parameter limit; ~9 columns here, so 1,000
  // rows/chunk stays well under it).
  // sku_catalog's unique constraint is (service_id, instance_type, os, arch,
  // engine, ha_mode) — it does NOT include region_id, since a SKU's hardware
  // spec is the same across regions. A single multi-row INSERT ... ON
  // CONFLICT DO UPDATE cannot touch the same conflict-target row twice
  // (Postgres error 21000, "cannot affect row a second time"), so any two
  // records for the same instance type in different regions (e.g. Azure
  // eastus + westus2) landing in the same chunk aborted the whole chunk —
  // confirmed 2026-07-24 (hundreds of "current transaction is aborted"
  // cascades from a single real collision). Fix: dedupe the sku_catalog
  // rows we send per chunk on the SKU key alone (dropping region_id), while
  // still emitting one regional_prices row per original record.
  const skuKey = (r: NormalizedPricingRecord) => {
    const a = r.attributes ?? {};
    return [
      r.serviceId, r.instanceType, r.os ?? 'linux', r.arch ?? 'x86_64',
      (a as any).engine ?? '', (a as any).ha_mode ?? ''
    ].join('|');
  };

  const batchSize = 1000;
  for (let i = 0; i < deduped.length; i += batchSize) {
    const chunk = deduped.slice(i, i + batchSize);

    const skuRowsByKey = new Map<string, NormalizedPricingRecord>();
    for (const r of chunk) {
      const key = skuKey(r);
      if (!skuRowsByKey.has(key)) skuRowsByKey.set(key, r);
    }
    const uniqueSkuRecords = [...skuRowsByKey.values()];
    const skuRows = uniqueSkuRecords.map(r => {
      const attrs = r.attributes && Object.keys(r.attributes).length > 0 ? r.attributes : null;
      return {
        service_id: r.serviceId,
        instance_type: r.instanceType,
        vcpus: r.vcpus ?? null,
        memory_gb: r.memoryGb ?? null,
        os: r.os ?? 'linux',
        arch: r.arch ?? 'x86_64',
        cpu_vendor: r.cpuVendor ?? null,
        gpu_count: r.gpuCount ?? 0,
        attributes: attrs ? sql.json(attrs) : null,
      };
    });

    // Run each chunk in its own savepoint. If something still goes wrong
    // (malformed row, unexpected constraint hit), roll back just this
    // savepoint instead of poisoning the entire outer transaction — before
    // this, one chunk failure cascaded "transaction is aborted" errors
    // through every remaining row in the per-row fallback below it.
    try {
      await sql.savepoint(async (sql: any) => {
        const skuResult = await sql`
          INSERT INTO sku_catalog ${sql(skuRows)}
          ON CONFLICT (service_id, instance_type, os, arch,
                       (COALESCE(attributes->>'engine', '')),
                       (COALESCE(attributes->>'ha_mode', '')))
          DO UPDATE SET
            vcpus = EXCLUDED.vcpus,
            memory_gb = EXCLUDED.memory_gb,
            cpu_vendor = EXCLUDED.cpu_vendor,
            gpu_count = EXCLUDED.gpu_count
          RETURNING id
        `;

        // Postgres preserves input row order in RETURNING for a single
        // multi-row VALUES INSERT, so zipping ids back to `uniqueSkuRecords`
        // by index is safe here.
        const skuIdByKey = new Map<string, number>();
        skuResult.forEach((row: any, idx: number) => {
          skuIds.add(row.id);
          skuIdByKey.set(skuKey(uniqueSkuRecords[idx]), row.id);
        });

        const priceRows = chunk.map(r => ({
          sku_id: skuIdByKey.get(skuKey(r))!,
          region_id: r.regionId,
          price_per_unit: r.pricePerUnit,
          unit: r.unit ?? 'hourly',
          currency: r.currency ?? 'USD',
        }));

        await sql`
          INSERT INTO regional_prices ${sql(priceRows)}
          ON CONFLICT (sku_id, region_id)
          DO UPDATE SET
            price_per_unit = EXCLUDED.price_per_unit,
            unit = EXCLUDED.unit,
            currency = EXCLUDED.currency,
            updated_at = CURRENT_TIMESTAMP
        `;
        prices += priceRows.length;
      });
    } catch (err: any) {
      // Whole-chunk insert failed (e.g. one malformed row) — fall back to
      // per-row for just this chunk, also inside a savepoint per row so one
      // bad record can't abort the rest of the fallback either.
      console.warn(`⚠️  Normalized bulk upsert failed for a chunk, falling back to per-row: ${err.message}`);
      for (const record of chunk) {
        try {
          await sql.savepoint(async (sql: any) => {
            const skuId = await saveNormalizedPricing(sql, record);
            skuIds.add(skuId);
            prices++;
          });
        } catch (rowErr: any) {
          console.warn(`⚠️  Normalized write failed for ${record.instanceType}: ${rowErr.message}`);
          skipped++;
        }
      }
    }
  }

  return { skus: skuIds.size, prices, skipped };
}

/**
 * Backfills the premium catalog from any pricing_records the pipelines missed.
 *
 * WHY THIS EXISTS: saveNormalizedPricingBatch() is called from
 * PricingPipeline.saveRecords(), so it only runs for pipelines that inherit
 * from PricingPipeline. Seven pipelines — networking, security, time-series,
 * graph, search, certificate management and inference endpoints — perform
 * their own INSERTs and bypass saveRecords() entirely. Before this
 * reconciliation existed, all 174 of their rows were invisible to Bring Your
 * Estimate: present in pricing_records, absent from sku_catalog, and
 * completely silent — the ingestion log showed success, and the catalog
 * freshness check still looked healthy because the other pipelines kept
 * regional_prices current.
 *
 * Rather than modify seven pipelines (and rely on remembering to wire up the
 * eighth), this runs once at the end of ingestion and reconciles whatever is
 * missing. Any future pipeline that bypasses saveRecords is covered
 * automatically.
 *
 * Anchor filtering still applies: only regions flagged is_anchor are
 * projected, which keeps the catalog from growing by the full region count.
 * The SQL mirrors the backfill in migrations/001_premium_normalized_pricing.sql.
 */
export async function reconcileNormalizedCatalog(
  sql: Sql
): Promise<{ skusAdded: number; pricesAdded: number }> {
  // 1. SKU specs missing from sku_catalog.
  //
  // DISTINCT ON collapses the same SKU across regions to a single spec row —
  // hardware is identical per region, and without it the multi-row upsert
  // would hit the same conflict target twice (Postgres 21000).
  const skuResult = await sql`
    INSERT INTO sku_catalog (service_id, instance_type, vcpus, memory_gb, arch, os, cpu_vendor, gpu_count, attributes)
    SELECT DISTINCT ON (
        pr.service_id, pr.instance_type, pr.os, pr.arch,
        COALESCE(pr.attributes->>'engine', ''), COALESCE(pr.attributes->>'ha_mode', '')
      )
      pr.service_id,
      pr.instance_type,
      pr.vcpus,
      pr.memory_gb,
      COALESCE(pr.arch, 'x86_64'),
      COALESCE(pr.os, 'linux'),
      pr.cpu_vendor,
      COALESCE(pr.gpu_count, 0),
      pr.attributes
    FROM pricing_records pr
    JOIN regions r ON r.id = pr.region_id
    WHERE pr.instance_type IS NOT NULL
      AND r.is_anchor = TRUE
    ORDER BY
      pr.service_id, pr.instance_type, pr.os, pr.arch,
      COALESCE(pr.attributes->>'engine', ''), COALESCE(pr.attributes->>'ha_mode', ''),
      pr.updated_at DESC
    ON CONFLICT (service_id, instance_type, os, arch,
                 (COALESCE(attributes->>'engine', '')),
                 (COALESCE(attributes->>'ha_mode', '')))
    DO NOTHING
    RETURNING id
  `;

  // 2. Prices missing from regional_prices.
  //
  // DO NOTHING rather than DO UPDATE: rows the pipelines already wrote are
  // authoritative and must not be overwritten by this sweep.
  const priceResult = await sql`
    INSERT INTO regional_prices (sku_id, region_id, price_per_unit, unit, currency)
    SELECT DISTINCT ON (k.id, pr.region_id)
      k.id,
      pr.region_id,
      pr.price_per_unit,
      COALESCE(pr.unit, 'hourly'),
      COALESCE(pr.currency, 'USD')
    FROM pricing_records pr
    JOIN regions r ON r.id = pr.region_id
    JOIN sku_catalog k
      ON k.service_id = pr.service_id
     AND k.instance_type = pr.instance_type
     AND k.os = COALESCE(pr.os, 'linux')
     AND k.arch = COALESCE(pr.arch, 'x86_64')
     AND COALESCE(k.attributes->>'engine', '') = COALESCE(pr.attributes->>'engine', '')
     AND COALESCE(k.attributes->>'ha_mode', '') = COALESCE(pr.attributes->>'ha_mode', '')
    WHERE r.is_anchor = TRUE
      AND pr.price_per_unit IS NOT NULL
    ORDER BY k.id, pr.region_id, pr.updated_at DESC
    ON CONFLICT (sku_id, region_id) DO NOTHING
    RETURNING id
  `;

  return { skusAdded: skuResult.length, pricesAdded: priceResult.length };
}

/**
 * Reports categories present in pricing_records but absent from the premium
 * catalog, split by whether the gap is actionable.
 *
 * Two very different situations look identical from a row count alone:
 *
 *  - **Structural** — every row in the category has no region_id and no vcpus.
 *    These are consumption-priced line items (NAT gateway per GB, VPN per
 *    hour, TLS certificates, per-request security rules). regional_prices is
 *    keyed on region_id, so they cannot be represented; and the matching
 *    engine compares vCPU and RAM, so they could never match even if they
 *    were. As of 2026-07-25 this covers networking, security, time-series,
 *    graph, search, certificates and inference endpoints — 174 rows. Expected,
 *    not a defect.
 *
 *  - **Actionable** — the category HAS region-scoped, spec-bearing rows that
 *    nonetheless failed to reach the catalog. That is a real bug worth
 *    surfacing loudly.
 *
 * Reporting both as one warning would print the same seven lines on every run
 * and train the reader to ignore the message — including on the day it means
 * something.
 */
export async function findUncoveredCategories(
  sql: Sql
): Promise<Array<{ category: string; pricing_rows: number; matchable_rows: number; actionable: boolean }>> {
  return await sql`
    WITH priced AS (
      SELECT
        s.category,
        COUNT(*)::int AS n,
        -- A row can only ever appear in the premium catalog if it carries a
        -- region and an instance type. Anything else is consumption pricing.
        COUNT(*) FILTER (
          WHERE pr.region_id IS NOT NULL AND pr.instance_type IS NOT NULL
        )::int AS matchable
      FROM pricing_records pr
      JOIN services s ON s.id = pr.service_id
      GROUP BY 1
    ),
    covered AS (
      SELECT s.category, COUNT(*)::int AS n
      FROM regional_prices rp
      JOIN sku_catalog k ON k.id = rp.sku_id
      JOIN services s ON s.id = k.service_id
      GROUP BY 1
    )
    SELECT
      priced.category,
      priced.n         AS pricing_rows,
      priced.matchable AS matchable_rows,
      (priced.matchable > 0) AS actionable
    FROM priced
    LEFT JOIN covered ON covered.category = priced.category
    WHERE COALESCE(covered.n, 0) = 0
    ORDER BY priced.matchable DESC, priced.n DESC
  `;
}
