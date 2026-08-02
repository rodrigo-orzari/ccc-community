'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer, Sidebar, PRODUCT_TYPE_ICONS, CopyHeading } from '@/components';
import { HelpCircle } from 'lucide-react';
import { STATUS_SPONSOR } from '@/config';

interface PipelineStatus {
  category: string;
  display_name: string;
  record_count: number;
  api_count: number;
  static_count: number;
  last_updated: string | null;
  data_source: 'api' | 'static' | 'mixed' | 'none';
}

interface ProviderStatus {
  name: string;
  slug: string;
  total_records: number;
  last_updated: string | null;
  pipelines: PipelineStatus[];
}

interface PremiumCatalogStatus {
  sku_count: number;
  price_count: number;
  anchor_region_count: number;
  last_updated: string | null;
  /** Hours by which the normalized catalog trails pricing_records. */
  staleness_hours: number | null;
}

interface StatusData {
  generated_at: string;
  last_ingested: string | null;
  total_records: number;
  total_api_records: number;
  total_static_records: number;
  premium_catalog: PremiumCatalogStatus | null;
  providers: ProviderStatus[];
}

const PROVIDER_COLORS: Record<string, string> = {
  aws: '#FF9900',
  azure: '#00BCFF',
  gcp: '#34A853',
  oracle: '#F80000',
  digitalocean: '#0069FF',
  alibaba: '#FF6A00',
  openai: '#10A37F',
  anthropic: '#CC9D87',
  // Vector DB + edge providers (brand colours mirror src/config/index.ts)
  pinecone: '#3B1CFF',
  milvus: '#00D2D3',
  qdrant: '#FF004E',
  weaviate: '#2DCA73',
  chroma: '#FF4F00',
  cloudflare: '#F38020',
};

const PROVIDER_URLS: Record<string, string> = {
  aws: 'https://aws.amazon.com',
  azure: 'https://azure.microsoft.com',
  gcp: 'https://cloud.google.com',
  oracle: 'https://www.oracle.com/cloud/',
  digitalocean: 'https://www.digitalocean.com',
  alibaba: 'https://www.alibabacloud.com',
  openai: 'https://openai.com/api/pricing/',
  anthropic: 'https://www.anthropic.com/pricing',
  pinecone: 'https://www.pinecone.io',
  milvus: 'https://zilliz.com',
  qdrant: 'https://qdrant.tech',
  weaviate: 'https://weaviate.io',
  chroma: 'https://www.trychroma.com',
  cloudflare: 'https://www.cloudflare.com',
};

const SITE_URL = 'https://comparecloudcosts.com';
const SHARE_TEXT = 'Compare Cloud Costs lets you compare pricing across AWS, Azure, Google Cloud, and 11 more providers — free, no signup. #FinOps';

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const PIPELINE_ORDER = ['compute', 'database', 'serverless', 'containers', 'networking', 'data_warehouse', 'ai', 'storage', 'app-hosting', 'security', 'integration'];



function SourceBadge({ source, apiCount, staticCount }: { source: string; apiCount: number; staticCount: number }) {
  if (source === 'none') return <span style={{ color: 'var(--muted)' }}>—</span>;

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '1px 6.5px',
    borderRadius: '9999px',
    fontSize: 7,
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    border: '1px solid',
  };

  if (source === 'api') return (
    <span style={{ ...badgeStyle, color: '#16a34a', borderColor: '#16a34a40', backgroundColor: '#16a34a18' }}>
      API
    </span>
  );
  if (source === 'static') return (
    <span style={{ ...badgeStyle, color: '#d97706', borderColor: '#d9770640', backgroundColor: '#d9770618' }}>
      Static
    </span>
  );
  // mixed — stacked in two rows (rather than side by side) so both badges stay
  // readable at this font size; the table's `vertical-align: middle` on td
  // already re-centers the provider name against whatever height this adds.
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ ...badgeStyle, color: '#16a34a', borderColor: '#16a34a40', backgroundColor: '#16a34a18' }}>
        API
      </span>
      <span style={{ ...badgeStyle, color: '#d97706', borderColor: '#d9770640', backgroundColor: '#d9770618' }}>
        Static
      </span>
    </span>
  );
}

const BackToTop = () => (
  <p style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
    <a
      href="#top"
      style={{ color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none' }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
    >
      ↑ Go back to the top
    </a>
  </p>
);

/**
 * Sort state for the status matrix.
 *
 * key is either 'provider' (sort rows alphabetically) or a category slug
 * (sort rows by that category's record count). Mirrors the SortConfig
 * convention used by PricingTable so the interaction feels identical to the
 * product tables.
 */
interface StatusSortConfig { key: string; direction: 'asc' | 'desc'; }

const StatusSortIcon = ({ sortKey, sortConfig }: { sortKey: string; sortConfig: StatusSortConfig }) => {
  const active = sortConfig.key === sortKey;
  return (
    <span style={{ marginLeft: 3, opacity: active ? 1 : 0.25, fontSize: '9px' }}>
      {active ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
};

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Default: providers A→Z. Clicking a category header switches to sorting by
  // that category's record count, descending first — when someone sorts by a
  // volume column they almost always want the biggest numbers on top.
  const [sortConfig, setSortConfig] = useState<StatusSortConfig>({ key: 'provider', direction: 'asc' });

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // Provider is a name (A→Z reads naturally); categories are counts
      // (high→low reads naturally).
      return { key, direction: key === 'provider' ? 'asc' : 'desc' };
    });
  };

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);


  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const shareOnX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  return (
    <>
      <style>{`
        :root {
          --bg: #ffffff;
          --surface: #ffffff;
          --border: #e5e5e5;
          --text: #171717;
          --muted: #737373;
          --link: #2563eb;
          --divider: #e5e5e5;
          --row-hover: #fafafa;
        }
        .dark {
          --bg: #000000;
          --surface: #000000;
          --border: #262626;
          --text: #e5e7eb;
          --muted: #a3a3a3;
          --link: #818cf8;
          --divider: #262626;
          --row-hover: #0a0a0a;
        }
        .status-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }
        .status-header {
          border-bottom: 1px solid var(--border);
          padding: 2rem 2.5rem 1.5rem;
        }
        .status-body {
          padding: 2rem 2.5rem 5rem;
        }
        .status-wrapper footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
        }
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 2.5rem;
        }
        .summary-card {
          background: var(--surface);
          padding: 1.25rem 1.5rem;
          text-align: center;
        }
        .summary-card-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          color: var(--muted);
          margin-bottom: 0.4rem;
        }
        .summary-card-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text);
          line-height: 1;
        }
        .summary-card-sub {
          font-size: 11px;
          color: var(--muted);
          margin-top: 0.3rem;
        }
        .provider-card {
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
        }
        .provider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
        }
        .provider-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .provider-badge {
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border: 1px solid;
        }
        .provider-header-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          font-size: 12px;
          color: var(--muted);
        }
        .pipeline-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          table-layout: fixed;
        }
        .pipeline-table th {
          text-align: center;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--muted);
          padding: 0.6rem 0.6rem;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .pipeline-table th:first-child { text-align: left; }
        /* Sortable headers: hover cue so the column reads as interactive. */
        .pipeline-table th:hover { color: var(--text); }
        .pipeline-table td {
          padding: 0.6rem 0.6rem;
          border-bottom: 1px solid var(--divider);
          vertical-align: middle;
          text-align: center;
        }
        .pipeline-table td:first-child { text-align: left; }
        .pipeline-table tr:last-child td {
          border-bottom: none;
        }
        /* Alternating row backgrounds and hovers are handled dynamically via Tailwind classnames on tr */
        @media (max-width: 640px) {
          .status-header, .status-body { padding: 1.25rem 1rem; }
          .pipeline-table th, .pipeline-table td { padding: 0.55rem 1rem; }
          .provider-header { padding: 0.875rem 1rem; }
          .summary-card { padding: 1rem; }
        }
      `}</style>

      <div className="status-wrapper flex flex-col lg:flex-row min-h-[100dvh] lg:h-screen bg-[var(--bg)] text-[var(--text)] font-sans lg:overflow-hidden">
        <Sidebar activeProductType={"status" as any} />

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto flex flex-col">
          <main className="flex-1 p-8 lg:p-10 pb-20 w-full max-w-[1600px] mx-auto">
            {/* Constrained layout for header */}
            <div className="max-w-[1600px] mx-auto mb-6" id="top">
              <h1 className="text-3xl font-bold mb-2 text-[var(--text)]">
                Status
              </h1>
              <p className="text-sm text-[#737373] dark:text-[#a3a3a3] leading-relaxed">
                See how many prices we've gathered, whether each came from a live API or a static fallback, and when data last updated.
              </p>
            </div>

            {/* Divider */}
            <div className="max-w-[1600px] mx-auto h-px bg-[var(--border)] mb-8" />

            {/* Sponsorship Box */}
            <div className="max-w-[1600px] mx-auto">
              {STATUS_SPONSOR ? (
                <a
                  href={STATUS_SPONSOR.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="mb-8 block rounded overflow-hidden border border-[var(--border)]"
                >
                  <img
                    src={STATUS_SPONSOR.imageUrl}
                    alt={`Sponsored by ${STATUS_SPONSOR.companyName}`}
                    width={1200}
                    height={200}
                    className="w-full h-auto aspect-[6/1] object-cover"
                  />
                </a>
              ) : (
                <div className="mb-8 border-2 border-dashed border-[var(--border)] rounded bg-[var(--row-hover)] p-6 flex flex-col items-center gap-3 text-center">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text)] mb-1 flex items-center justify-center gap-2">
                      Sponsor This Page
                    </h3>
                    <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                      Sponsor this page. Your brand in front of engineers and architects comparing cloud pricing. See <Link href="/docs#advertising" className="text-[#2563eb] dark:text-[#818cf8] hover:underline font-bold">Advertising with Us in the Documentation</Link>, or email hello@comparecloudcosts.com.
                    </p>
                    <p className="text-[11px] text-[var(--muted)] mt-1.5 opacity-80">
                      Banner spec: 1200 × 200px (6:1 ratio) · PNG, JPG, or WebP. See the <Link href="/docs#advertising-specs" className="underline hover:text-[var(--text)]">Docs</Link> for detailed instructions.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="max-w-[1600px] mx-auto h-px bg-[var(--border)] mb-8" />

            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontSize: 13 }}>
                Loading status…
              </div>
            )}

            {error && (
              <div className="max-w-[1600px] mx-auto" style={{ padding: '1.5rem', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                Failed to load status: {error}
              </div>
            )}

            {status && !loading && (() => {
                // Same restriction as the Coverage Matrix below: only count
                // categories that are actually browsable on the site (the
                // sidebar's PRODUCT_TYPE_ICONS keys), so these summary cards
                // and the matrix's own "Total Records" row always agree.
                const browsableCategories = new Set(Object.keys(PRODUCT_TYPE_ICONS));
                let browsableTotalRecords = 0;
                let browsableApiRecords = 0;
                let browsableStaticRecords = 0;
                status.providers.forEach(p => {
                  p.pipelines.forEach(pl => {
                    if (browsableCategories.has(pl.category)) {
                      browsableTotalRecords += pl.record_count || 0;
                      browsableApiRecords += pl.api_count || 0;
                      browsableStaticRecords += pl.static_count || 0;
                    }
                  });
                });

                return (
              <>
                {/* Summary Section Header */}
                <div className="max-w-[1600px] mx-auto mb-4">
                  <CopyHeading id="summary" className="text-xl font-bold text-[var(--text)] mb-1 scroll-mt-6">
                    Summary
                  </CopyHeading>
                  <p className="text-sm text-[var(--muted)]">A high-level look at the total number of pricing records across all providers.</p>
                </div>

                {/* Summary cards */}
                <div className="max-w-[1600px] mx-auto">
                  <div className="summary-cards">
                    <div className="summary-card">
                      <div className="summary-card-label">Total Records</div>
                      <div className="summary-card-value">{browsableTotalRecords.toLocaleString()}</div>
                      <div className="summary-card-sub">across all providers &amp; categories</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-card-label">Live API Records</div>
                      <div className="summary-card-value" style={{ color: '#16a34a' }}>
                        {browsableApiRecords.toLocaleString()}
                      </div>
                      <div className="summary-card-sub">
                        {browsableTotalRecords > 0
                          ? `${Math.round((browsableApiRecords / browsableTotalRecords) * 100)}% of total`
                          : '—'}
                      </div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-card-label">Static Config Records</div>
                      <div className="summary-card-value" style={{ color: '#d97706' }}>
                        {browsableStaticRecords.toLocaleString()}
                      </div>
                      <div className="summary-card-sub">
                        {browsableTotalRecords > 0
                          ? `${Math.round((browsableStaticRecords / browsableTotalRecords) * 100)}% of total`
                          : '—'}
                      </div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-card-label">Providers</div>
                      <div className="summary-card-value">
                        {status.providers.filter(p => p.total_records > 0).length}
                      </div>
                      <div className="summary-card-sub">with data</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-card-label">Last Ingested</div>
                      <div className="summary-card-value">
                        {status.last_ingested
                          ? new Date(status.last_ingested).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </div>
                      <div className="summary-card-sub">most recent run</div>
                    </div>
                  </div>
                </div>

                {/* Premium catalog health.
                    sku_catalog / regional_prices are a normalized projection of
                    the same pricing data, written by the same ingestion run.
                    Surfaced separately because they can fall behind silently:
                    if the projection write fails while pricing_records succeeds,
                    every number above still looks healthy. */}
                {status.premium_catalog && (
                  <div className="max-w-[1600px] mx-auto mb-8">
                    <CopyHeading id="specialized-catalog" className="text-xl font-bold text-[var(--text)] mb-1 scroll-mt-6">
                      Specialized Catalog
                    </CopyHeading>
                    <p className="text-sm text-[var(--muted)] mb-4">
                      The specs-and-price index that powers <Link href="/bringyourestimate" className="text-[#2563eb] dark:text-[#818cf8] hover:underline font-semibold">Bring Your Estimate</Link> and <Link href="/bringyourbill" className="text-[#2563eb] dark:text-[#818cf8] hover:underline font-semibold">Bring Your Bill</Link> — built so your
                      workloads get matched on what they actually run, not on which category they fall into.
                    </p>
                    <div className="summary-cards">
                      <div className="summary-card">
                        <div className="summary-card-label">SKUs Catalogued</div>
                        <div className="summary-card-value">
                          {status.premium_catalog.sku_count.toLocaleString()}
                        </div>
                        <div className="summary-card-sub">unique hardware &amp; service specs</div>
                      </div>
                      <div className="summary-card">
                        <div className="summary-card-label">Regional Prices</div>
                        <div className="summary-card-value">
                          {status.premium_catalog.price_count.toLocaleString()}
                        </div>
                        <div className="summary-card-sub">SKU × region price points</div>
                      </div>
                      <div className="summary-card">
                        <div className="summary-card-label">Anchor Regions</div>
                        <div className="summary-card-value">
                          {status.premium_catalog.anchor_region_count}
                        </div>
                        <div className="summary-card-sub">live-priced pricing hubs</div>
                      </div>
                      <div className="summary-card">
                        <div className="summary-card-label">Catalog Freshness</div>
                        {(() => {
                          // A projection more than a day behind pricing_records
                          // means ingestion updated the site but not the premium
                          // catalog — the exact failure this card exists to catch.
                          const hours = status.premium_catalog!.staleness_hours;
                          const stale = hours != null && hours > 24;
                          return (
                            <>
                              <div
                                className="summary-card-value"
                                style={{ color: stale ? '#dc2626' : '#16a34a' }}
                              >
                                {hours == null
                                  ? '—'
                                  : hours < 1
                                    ? 'In sync'
                                    : `${Math.round(hours)}h behind`}
                              </div>
                              <div className="summary-card-sub">
                                {stale ? 'projection is lagging ingestion' : 'vs. latest pricing record'}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="summary-card">
                        <div className="summary-card-label">Last Updated</div>
                        <div className="summary-card-value">
                          {status.premium_catalog.last_updated
                            ? new Date(status.premium_catalog.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </div>
                        <div className="summary-card-sub">most recent price write</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="max-w-[1600px] mx-auto h-px bg-[var(--border)] mb-8" />

                {/* Table Section Header */}
                <div className="max-w-[1600px] mx-auto mb-4">
                  <CopyHeading id="coverage-matrix" className="text-xl font-bold text-[var(--text)] mb-1 scroll-mt-6">
                    Coverage Matrix
                  </CopyHeading>
                  <p className="text-sm text-[var(--muted)]">Detailed breakdown of product categories and the volume of pricing data gathered for each provider. Click any column header to sort — by provider name, or by record count within a category.</p>
                </div>

              {/* Status Matrix Table */}
              {(() => {
                // Rows are providers; columns are categories. Sorting by a
                // category means ordering providers by that column's record
                // count. Providers with no data in that category count as 0
                // and sink to the bottom on a descending sort.
                const recordsFor = (provider: ProviderStatus, category: string) =>
                  provider.pipelines.find(p => p.category === category)?.record_count ?? 0;

                const sortedProviders = [...status.providers].sort((a, b) => {
                  if (sortConfig.key === 'provider') {
                    // localeCompare so casing and accented names sort predictably.
                    const cmp = a.name.localeCompare(b.name);
                    return sortConfig.direction === 'asc' ? cmp : -cmp;
                  }
                  const diff = recordsFor(a, sortConfig.key) - recordsFor(b, sortConfig.key);
                  // Ties are common (several providers sitting at 0 for a
                  // niche category), so fall back to name for a stable,
                  // predictable order rather than leaving it to sort internals.
                  if (diff === 0) return a.name.localeCompare(b.name);
                  return sortConfig.direction === 'asc' ? diff : -diff;
                });

                // Collect all categories returned from all providers, restricted to
                // the sidebar's real, browsable product types (PRODUCT_TYPE_ICONS'
                // keys). A few older pipelines (time-series, graph, search,
                // certificates, inference) write real data to pricing_records but
                // were never turned into actual site categories/pages, so without
                // this filter they'd show up here and nowhere else on the site —
                // confusing, since Status is meant to mirror what's actually
                // browsable. Their data isn't touched, just not displayed here.
                const browsableCategories = new Set(Object.keys(PRODUCT_TYPE_ICONS));
                const allReturnedCategories = new Set<string>();
                status.providers.forEach(p => {
                  p.pipelines.forEach(pl => {
                    if (browsableCategories.has(pl.category)) {
                      allReturnedCategories.add(pl.category);
                    }
                  });
                });

                const getCategoryDisplayName = (category: string) => {
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
                    'time-series': 'Time-Series',
                    graph: 'Graph',
                    search: 'Search',
                    certificates: 'Certificates',
                    inference: 'Inference',
                  };
                  return PIPELINE_DISPLAY[category] ?? (category.charAt(0).toUpperCase() + category.slice(1));
                };

                const getCategoryIcon = (category: string) => {
                  const PIPELINE_ICON: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>> = {
                    vm: PRODUCT_TYPE_ICONS.vm,
                    gpu: PRODUCT_TYPE_ICONS.gpu,
                    database: PRODUCT_TYPE_ICONS.database,
                    serverless: PRODUCT_TYPE_ICONS.serverless,
                    containers: PRODUCT_TYPE_ICONS.containers,
                    networking: PRODUCT_TYPE_ICONS.networking,
                    'data-analytics': PRODUCT_TYPE_ICONS['data-analytics'],
                    ai: PRODUCT_TYPE_ICONS.ai,
                    storage: PRODUCT_TYPE_ICONS.storage,
                    'app-hosting': PRODUCT_TYPE_ICONS['app-hosting'],
                    integration: PRODUCT_TYPE_ICONS.integration,
                    security: PRODUCT_TYPE_ICONS.security,
                    'time-series': PRODUCT_TYPE_ICONS.database,
                    graph: PRODUCT_TYPE_ICONS.database,
                    search: PRODUCT_TYPE_ICONS.database,
                    certificates: PRODUCT_TYPE_ICONS.security,
                    inference: PRODUCT_TYPE_ICONS.ai,
                  };
                  return PIPELINE_ICON[category] ?? HelpCircle;
                };

                // Unique categories sorted alphabetically by display name
                const categories = Array.from(allReturnedCategories).sort((a, b) => {
                  const nameA = getCategoryDisplayName(a).toLowerCase();
                  const nameB = getCategoryDisplayName(b).toLowerCase();
                  return nameA.localeCompare(nameB);
                });

                // Per-category totals across every provider, for the summary rows
                // at the bottom of the table (mirrors the per-provider totals the
                // pre-transpose table used to show, just aggregated along the other axis).
                const categoryTotals = categories.map(category => {
                  let recordCount = 0;
                  let apiCount = 0;
                  let staticCount = 0;
                  sortedProviders.forEach(provider => {
                    const pl = provider.pipelines.find(p => p.category === category);
                    if (pl) {
                      recordCount += pl.record_count || 0;
                      apiCount += pl.api_count || 0;
                      staticCount += pl.static_count || 0;
                    }
                  });
                  return { category, recordCount, apiCount, staticCount };
                });

                return (
                  <div id="status-matrix" className="max-w-[1600px] mx-auto" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', marginBottom: '2.5rem' }}>
                    <table className="pipeline-table" style={{ minWidth: 130 + categories.length * 74 }}>
                      <thead>
                        <tr>
                          <th
                            onClick={() => handleSort('provider')}
                            title="Sort providers by name"
                            aria-sort={sortConfig.key === 'provider' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                            style={{ width: 130, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                          >
                            Provider
                            <StatusSortIcon sortKey="provider" sortConfig={sortConfig} />
                          </th>
                          {categories.map(category => {
                            const CategoryIcon = getCategoryIcon(category);
                            const displayName = getCategoryDisplayName(category);
                            return (
                              <th
                                key={category}
                                onClick={() => handleSort(category)}
                                title={`Sort providers by ${displayName} record count`}
                                aria-sort={sortConfig.key === category ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                                style={{ width: 74, textAlign: 'center', padding: '0.6rem 0.3rem', cursor: 'pointer', userSelect: 'none' }}
                              >
                                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <CategoryIcon size={13} aria-hidden="true" />
                                  <span style={{ fontSize: '9px', lineHeight: 1.15 }}>
                                    {displayName}
                                    <StatusSortIcon sortKey={category} sortConfig={sortConfig} />
                                  </span>
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProviders.map((provider, index) => {
                          const color = PROVIDER_COLORS[provider.slug] ?? '#888';
                          return (
                          <tr
                            key={provider.slug}
                            className={`transition-colors ${
                              index % 2 === 0
                                ? 'bg-[#f7f8ff] dark:bg-[#06060f]'
                                : 'bg-[#e8eaf8] dark:bg-[#10102a]'
                            } hover:bg-[#eef2ff] dark:hover:bg-[#111827]`}
                          >
                            <td style={{ fontWeight: 600, textAlign: 'center' }}>
                              <a
                                href={PROVIDER_URLS[provider.slug] ?? '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all duration-200"
                                style={{
                                  color,
                                  borderColor: `${color}40`,
                                  backgroundColor: `${color}12`,
                                  textDecoration: 'none',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = `${color}25`;
                                  (e.currentTarget as HTMLAnchorElement).style.borderColor = color;
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = `${color}12`;
                                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}40`;
                                }}
                              >
                                {provider.name}
                              </a>
                            </td>
                            {categories.map(category => {
                              const pl = provider.pipelines.find(p => p.category === category);
                              if (!pl) {
                                return (
                                  <td key={category} style={{ color: 'var(--muted)' }}>
                                    —
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={category}
                                  title={pl.last_updated ? `Last updated: ${new Date(pl.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : undefined}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                      {pl.record_count > 0 ? pl.record_count.toLocaleString() : '0'}
                                    </span>
                                    <SourceBadge
                                      source={pl.data_source}
                                      apiCount={pl.api_count}
                                      staticCount={pl.static_count}
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                          );
                        })}

                        {/* Table Footer / Summary Rows */}
                        <tr style={{ background: 'var(--border)', height: '1px' }}>
                          <td colSpan={categories.length + 1} style={{ padding: 0, height: '1px' }}></td>
                        </tr>

                        {/* Total Records Row */}
                        <tr style={{ fontWeight: 700, background: 'var(--row-hover)' }}>
                          <td style={{ textAlign: 'left' }}>Total Records</td>
                          {categoryTotals.map(({ category, recordCount }) => (
                            <td key={category} style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {recordCount.toLocaleString()}
                            </td>
                          ))}
                        </tr>

                        {/* Live API Percentage Row */}
                        <tr style={{ fontSize: '10px', color: 'var(--muted)' }}>
                          <td style={{ textAlign: 'left', fontWeight: 600 }}>Live API Records</td>
                          {categoryTotals.map(({ category, apiCount, staticCount }) => {
                            const total = apiCount + staticCount;
                            const percent = total > 0 ? Math.round((apiCount / total) * 100) : 0;
                            return (
                              <td key={category} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {apiCount > 0 ? (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                    {percent}% <span style={{ fontSize: '8px', fontWeight: 400, opacity: 0.8 }}>({apiCount.toLocaleString()})</span>
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Static Config Percentage Row */}
                        <tr style={{ fontSize: '10px', color: 'var(--muted)' }}>
                          <td style={{ textAlign: 'left', fontWeight: 600 }}>Static Config Records</td>
                          {categoryTotals.map(({ category, apiCount, staticCount }) => {
                            const total = apiCount + staticCount;
                            const percent = total > 0 ? Math.round((staticCount / total) * 100) : 0;
                            return (
                              <td key={category} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {staticCount > 0 ? (
                                  <span style={{ color: '#d97706', fontWeight: 600 }}>
                                    {percent}% <span style={{ fontSize: '8px', fontWeight: 400, opacity: 0.8 }}>({staticCount.toLocaleString()})</span>
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Data source legend (Moved below table and unboxed) */}
              <div className="max-w-[1600px] mx-auto mb-8 mt-2 pl-2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: 12.5, color: 'var(--text)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ flexShrink: 0 }}><SourceBadge source="api" apiCount={0} staticCount={0} /></span>
                    <span>Pricing fetched live from the provider's pricing API during the most recent ingestion run. Most current and authoritative.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ flexShrink: 0 }}><SourceBadge source="static" apiCount={0} staticCount={0} /></span>
                    <span>Manual fallback pricing used when a live fetch fails. Not auto-refreshed.</span>
                  </div>
                </div>
              </div>

              <div className="max-w-[1600px] mx-auto mt-6">
                <BackToTop />
              </div>

              {/* Divider */}
              <div className="max-w-[1600px] mx-auto h-px bg-[var(--border)] my-8" />

              <div className="max-w-[1600px] mx-auto pb-8">
                <blockquote className="border-l-4 border-[#e5e5e5] dark:border-[#262626] pl-4 my-6 text-[12px] text-[#737373] dark:text-[#a3a3a3] italic">
                  <strong>Disclaimer:</strong>{' '}
                  Price data may be delayed, incomplete, or imprecise, and comparecloudcosts.com makes no accuracy warranties. Visit our{' '}
                  <Link href="/terms" className="underline hover:text-[#171717] dark:hover:text-[#e5e7eb]">Terms of Use</Link> for data coverage details.
                </blockquote>
              </div>
            </>
                );
              })()}
          </main>
        </div>
        <Footer />
        </div>
      </div>
    </>
  );
}
