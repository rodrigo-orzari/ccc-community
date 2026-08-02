'use client';

import React, { RefObject, useState, useEffect, useRef, useCallback } from 'react';
import type { ProductType, PricingRecord } from '@/types';
import { formatInstanceName } from '@/lib/formatInstanceName';

// ─── Provider colour map ────────────────────────────────────────────────────
const PROVIDERS: { id: string; name: string; color: string }[] = [
  { id: 'aws',          name: 'AWS',           color: '#FF9900' },
  { id: 'azure',        name: 'Azure',         color: '#00BCFF' },
  { id: 'gcp',          name: 'Google',        color: '#34A853' },
  { id: 'oracle',       name: 'Oracle',        color: '#F80000' },
  { id: 'digitalocean', name: 'DigitalOcean',  color: '#0069FF' },
  { id: 'alibaba',      name: 'Alibaba', color: '#FF6A00' },
];

// ─── Column definitions ─────────────────────────────────────────────────────
interface ColDef { key: string; defaultWidth: number; }

const C = (key: string, defaultWidth: number): ColDef => ({ key, defaultWidth });

// Display label for a stored cpu_vendor. Records store 'AWS' for Graviton
// chips; show the chip name so ARM results are identifiable (Graviton vs Ampere).
const cpuVendorLabel = (v?: string): string => (v === 'AWS' ? 'Graviton' : (v || '—'));

// Pretty-print a pricing unit for display: the stored flat-monthly unit 'Mo'
// reads better as '/mo'. Everything else passes through unchanged.
const prettyUnit = (u?: string): string => (u === 'Mo' ? '/mo' : (u || ''));

// Shared columns
const COL_PROVIDER   = C('provider',             100);
const COL_SKU        = C('instance_type',         180);
const COL_GEO        = C('geography',             120);
const COL_VCPU       = C('vcpus',                  70);
const COL_MEM        = C('memory_gb',             110);
const COL_PRICE      = C('price_per_unit',        140);
const COL_SOURCE     = C('source',                 80);

// Shared middle slots (reused with different labels per product type)
const COL_MID1       = C('engine_category',       140);
const COL_MID2       = C('db_family_cpu_vendor',  130);
const COL_MID3       = C('deployment_arch',       130);
const COL_MID4       = C('ha_mode_os',            100);
const COL_GPU        = C('gpu',                    70);
const COL_CPU_VENDOR = C('cpu_vendor_gpu',        120);

// Serverless-specific
const COL_SVC_TYPE   = C('svc_type',              130);
const COL_ARCH       = C('arch',                   90);
const COL_LANG       = C('languages',             160);
const COL_GRAN       = C('granularity',           100);
const COL_EXEC       = C('exec_model',            130);
const COL_PROV       = C('prov_concurrency',      140);
const COL_STOR       = C('max_storage',           110);
const COL_INV        = C('inv_price',             140);
const COL_UNIT       = C('unit',                  140);
const COL_NORM       = C('norm_price',            170);
const COL_GPU_VENDOR = C('gpu_vendor',            120);

const ALL_DEFS: ColDef[] = [
  COL_PROVIDER, COL_SKU, COL_GEO, COL_VCPU, COL_MEM, COL_PRICE, COL_SOURCE,
  COL_MID1, COL_MID2, COL_MID3, COL_MID4, COL_GPU, COL_CPU_VENDOR,
  COL_SVC_TYPE, COL_ARCH, COL_LANG, COL_GRAN, COL_EXEC, COL_PROV, COL_STOR, COL_INV, COL_UNIT, COL_NORM, COL_GPU_VENDOR,
];

const DEFAULT_WIDTHS: Record<string, number> =
  Object.fromEntries(ALL_DEFS.map(c => [c.key, c.defaultWidth]));

const MIN_WIDTH = 48;

function getColDefs(pt: ProductType): ColDef[] {
  const start = [COL_PROVIDER, COL_SKU];
  const tail  = [COL_GEO, COL_PRICE, COL_SOURCE];
  const specs = [COL_VCPU, COL_MEM];
  const tailWithSpecs = [COL_GEO, ...specs, COL_PRICE, COL_SOURCE];

  if (pt === 'vm')           return [...start, COL_MID1, COL_MID2, COL_MID3, COL_MID4, COL_GPU, ...tailWithSpecs];
  if (pt === 'gpu')          return [...start, COL_MID1, COL_GPU_VENDOR, COL_MID2, COL_MID4, COL_GPU, ...tailWithSpecs];
  if (pt === 'database')     return [...start, COL_MID1, COL_MID2, COL_MID3, COL_MID4, ...tailWithSpecs];
  if (pt === 'serverless')   return [...start, COL_SVC_TYPE, COL_ARCH, COL_LANG, COL_MID1, COL_MID2, COL_MID3, COL_MID4, COL_GRAN, COL_EXEC, COL_PROV, COL_STOR, COL_INV, COL_GEO, ...specs, COL_UNIT, COL_PRICE, COL_SOURCE];
  if (pt === 'containers')   return [...start, COL_MID1, COL_MID2, COL_MID3, COL_MID4, ...tailWithSpecs];
  if (pt === 'networking')   return [...start, COL_MID1, COL_MID2, COL_MID3, COL_MID4, COL_GPU, ...tail];
  if (pt === 'storage')        return [...start, COL_MID1, COL_MID2, COL_MID3, COL_MID4, ...tail];
  if (pt === 'app-hosting')    return [...start, COL_MID1, COL_MID2, COL_MID4, ...tailWithSpecs];
  if (pt === 'data-analytics') return [...start, COL_MID1, COL_MID3, COL_MID2, COL_VCPU, ...tail];
  if (pt === 'ai')             return [...start, COL_MID1, COL_MID3, COL_MID2, COL_MID4, COL_PRICE, COL_INV];
  if (pt === 'security')       return [...start, COL_MID2, COL_MID1, ...tail];
  if (pt === 'integration')    return [...start, COL_MID1, COL_MID2, COL_GEO, COL_UNIT, COL_PRICE, COL_NORM, COL_SOURCE];
  return [...start, ...tail];
}

// ─── LocalStorage helpers ───────────────────────────────────────────────────
const lsKey = (pt: string) => `ccc_col_widths_v2_${pt}`;

function loadWidths(pt: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(lsKey(pt));
    if (raw) return { ...DEFAULT_WIDTHS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_WIDTHS };
}

function saveWidths(pt: string, w: Record<string, number>) {
  try { localStorage.setItem(lsKey(pt), JSON.stringify(w)); } catch { /* ignore */ }
}

// ─── Sort icon ──────────────────────────────────────────────────────────────
interface SortConfig { key: string; direction: 'asc' | 'desc'; }

const SortIcon = ({ sortKey, sortConfig }: { sortKey: string; sortConfig: SortConfig }) => {
  const active = sortConfig.key === sortKey;
  return (
    <span className={`ml-1 inline-block transition-opacity ${active ? 'opacity-100' : 'opacity-25'}`}>
      {active ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
};

// ─── Props ──────────────────────────────────────────────────────────────────
interface PricingTableProps {
  data: PricingRecord[];
  loading: boolean;
  activeProductType: ProductType;
  showAggregation: boolean;
  tableScrollRef: RefObject<HTMLDivElement>;
  hasHorizontalOverflow: boolean;
  scrolledToEnd: boolean;
  sortConfig: SortConfig;
  onHeaderClick: (key: string) => void;
  lastUpdated?: string;
}

// ─── Resize handle ──────────────────────────────────────────────────────────
function ResizeHandle({ onStart, onReset }: { onStart: (e: React.PointerEvent) => void; onReset: () => void }) {
  return (
    <div
      className="ccc-rh"
      onPointerDown={onStart}
      onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}
    >
      <div className="ccc-rh-line" />
    </div>
  );
}

// ─── Row virtualization ──────────────────────────────────────────────────────
// Dependency-free windowing for large result sets: only the rows near the viewport
// are rendered, with spacer <tr>s standing in for the rest. This keeps the native
// table layout fully intact (colgroup widths, sticky header, column resize,
// horizontal scroll) — unlike absolute-positioning virtualizers. For small lists
// it is disabled entirely, so the common case renders exactly as it did before.
const VIRTUALIZE_THRESHOLD = 80; // at/below this many rows, render everything
const ROW_ESTIMATE_PX = 53;      // approximate rendered height of one table row
const ROW_OVERSCAN = 12;         // extra rows above/below the viewport (avoids flicker)

function useVirtualRows(
  scrollRef: RefObject<HTMLDivElement>,
  rowCount: number,
  enabled: boolean,
) {
  const [range, setRange] = useState<{ start: number; end: number }>({ start: 0, end: rowCount });

  // Reset range state whenever rowCount or virtualization status changes
  useEffect(() => {
    setRange({ start: 0, end: rowCount });
  }, [rowCount, enabled]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!enabled || !el) {
      setRange({ start: 0, end: rowCount });
      return;
    }
    const compute = () => {
      const viewport = el.clientHeight || 800;
      const visibleCount = Math.ceil(viewport / ROW_ESTIMATE_PX) + ROW_OVERSCAN * 2;
      const maxStart = Math.max(0, rowCount - visibleCount);
      const start = Math.min(Math.max(0, Math.floor(el.scrollTop / ROW_ESTIMATE_PX) - ROW_OVERSCAN), maxStart);
      const end = Math.min(rowCount, start + visibleCount);
      setRange(prev => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    compute();
    el.addEventListener('scroll', compute, { passive: true });
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', compute);
      ro.disconnect();
    };
  }, [scrollRef, rowCount, enabled]);

  if (!enabled) return { start: 0, end: rowCount, padTop: 0, padBottom: 0 };
  const start = Math.max(0, Math.min(range.start, rowCount));
  const end = Math.min(range.end, rowCount);
  return { start, end, padTop: start * ROW_ESTIMATE_PX, padBottom: Math.max(0, (rowCount - end) * ROW_ESTIMATE_PX) };
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function PricingTable({
  data,
  loading,
  activeProductType,
  showAggregation,
  tableScrollRef,
  hasHorizontalOverflow,
  scrolledToEnd,
  sortConfig,
  onHeaderClick,
  lastUpdated,
}: PricingTableProps) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);
  const widthsRef = useRef(colWidths);
  widthsRef.current = colWidths;

  // Reload widths from localStorage whenever the active product type changes.
  // The column widths act as proportions/minimums — the table itself is sized to
  // always fill its container (width:100% + min-width), and table-layout:fixed
  // distributes any extra space, so the table grows/shrinks with the browser.
  useEffect(() => {
    setColWidths(loadWidths(activeProductType));
    if (tableScrollRef?.current) {
      tableScrollRef.current.scrollTop = 0;
      tableScrollRef.current.scrollLeft = 0;
    }
  }, [activeProductType, tableScrollRef]);

  const startResize = useCallback((e: React.PointerEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX   = e.clientX;
    const startW   = widthsRef.current[colKey] ?? DEFAULT_WIDTHS[colKey] ?? 100;

    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: PointerEvent) => {
      const next = Math.max(MIN_WIDTH, startW + ev.clientX - startX);
      setColWidths(prev => ({ ...prev, [colKey]: next }));
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      saveWidths(activeProductType, widthsRef.current);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [activeProductType]);

  const resetWidth = useCallback((colKey: string) => {
    setColWidths(prev => {
      const next = { ...prev, [colKey]: DEFAULT_WIDTHS[colKey] ?? 100 };
      saveWidths(activeProductType, next);
      return next;
    });
  }, [activeProductType]);

  const colDefs    = getColDefs(activeProductType);
  const totalWidth = colDefs.reduce((s, c) => s + (colWidths[c.key] ?? c.defaultWidth), 0);

  // Virtualize the desktop table only when the result set is large. Below the
  // threshold, rowStart/rowEnd span the whole list and the pads are 0 — identical
  // to the previous "render every row" behavior.
  const virtualize = !loading && data.length > VIRTUALIZE_THRESHOLD;
  const { start: rowStart, end: rowEnd, padTop, padBottom } = useVirtualRows(tableScrollRef, data.length, virtualize);



  // For VMs, databases, and AI the name is the provider's real instance/model
  // identifier (e.g. m8a.12xlarge, db.r8i.4xlarge, GPT-5.4) and is searchable in
  // the provider's catalog. For serverless/containers/networking/analytics the
  // name is a normalized configuration the tool defines for comparison and may not
  // match an official provider SKU — flag that so users don't search for it in vain.
  const isRealSku = ['vm', 'database', 'ai'].includes(activeProductType);
  const skuTooltip = isRealSku
    ? "Provider instance/model identifier — searchable in the provider's catalog."
    : "Normalized configuration for cross-provider comparison — not an official provider SKU. Verify exact pricing on the provider's pricing page.";

  // Two-word headers ("CPU Vendor", "GPU Model", "HA Mode", ...) stack onto two
  // lines instead of staying on one — reads cleaner than truncating/widening the
  // column, at the cost of a slightly taller header row (applies uniformly across
  // every product category's table since Th is the single shared header renderer).
  // Single-word and 3+-word labels ("Provider", "Cold Start (ms)") are unaffected.
  const renderHeaderLabel = (label: React.ReactNode) => {
    if (typeof label === 'string') {
      const words = label.split(' ');
      if (words.length === 2) {
        return (
          <span className="flex flex-col leading-tight">
            <span>{words[0]}</span>
            <span>{words[1]}</span>
          </span>
        );
      }
    }
    return label;
  };

  // Helper: build a <th> with sort + resize handle
  const Th = ({
    colKey, sortKey, label, className = '',
  }: { colKey: string; sortKey?: string; label: React.ReactNode; className?: string }) => (
    <th
      data-col={colKey}
      onClick={sortKey ? () => onHeaderClick(sortKey) : undefined}
      className={`px-6 py-4 font-bold whitespace-nowrap ccc-th ${sortKey ? 'cursor-pointer hover:text-black dark:hover:text-[#f7f8ff] transition-colors' : ''} ${className}`}
      style={{ width: colWidths[colKey] ?? DEFAULT_WIDTHS[colKey] }}
    >
      <div className="flex items-center justify-center h-full w-full">
        {renderHeaderLabel(label)}
        {sortKey && <SortIcon sortKey={sortKey} sortConfig={sortConfig} />}
      </div>
      <ResizeHandle
        onStart={(e) => startResize(e, colKey)}
        onReset={() => resetWidth(colKey)}
      />
    </th>
  );

  return (
    <>
      {/* Resize handle styles — scoped to CCC table */}
      <style>{`
        .ccc-th {
          position: relative;
          overflow: hidden;
        }
        /* Hit zone — wider than the visible line so it's easier to grab */
        .ccc-rh {
          position: absolute;
          right: 0;
          top: 0;
          width: 12px;
          height: 100%;
          cursor: col-resize;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Always-visible divider line — signals the resize boundary */
        .ccc-rh-line {
          width: 2px;
          height: 65%;
          background: #e5e5e5;
          border-radius: 1px;
          pointer-events: none;
          transition: background 0.12s, height 0.12s;
        }
        /* Full-column hover: nudge the line a bit brighter */
        .ccc-th:hover .ccc-rh-line { background: #c4b5fd; height: 75%; }
        /* Direct handle hover: full indigo — "you can drag here" */
        .ccc-rh:hover  .ccc-rh-line { background: #6366f1; height: 80%; }
        .dark .ccc-rh-line { background: #2a2a2a; }
        .dark .ccc-th:hover .ccc-rh-line { background: #4c4570; }
        .dark .ccc-rh:hover  .ccc-rh-line { background: #818cf8; }
      `}</style>

      {/* Mobile: stacked cards (below lg). Bounded + internally scrollable —
          mirrors the desktop table's own scroll container (see the
          `hidden lg:block` wrapper below) — so a long result list doesn't
          push the footer hundreds of cards down the page; it scrolls inside
          this box instead, same "defined mobile scroll behavior" as desktop. */}
      <div className="lg:hidden p-3 space-y-3 overflow-y-auto" style={{ maxHeight: '65dvh' }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-[#dde0f0] dark:border-[#1e1e38] rounded-lg bg-white dark:bg-[#0a0a18] p-3 animate-pulse">
              <div className="h-3 bg-[#dde0f0] dark:bg-[#1e1e38] rounded w-20 mb-2" />
              <div className="h-3 bg-[#dde0f0] dark:bg-[#1e1e38] rounded w-32" />
            </div>
          ))
        ) : data.length > 0 ? (
          data.map((record, index) => (
            <MobileCard
              key={index}
              record={record}
              activeProductType={activeProductType}
              showAggregation={showAggregation}
            />
          ))
        ) : (
          <div className="px-6 py-24 text-center text-[#737373] dark:text-[#525252] italic text-sm">
            No matches for your filters.
          </div>
        )}
      </div>

      {/* Desktop: full table (lg and up) */}
      <div
        ref={tableScrollRef}
        className={`hidden lg:block flex-1 custom-scrollbar ${hasHorizontalOverflow && !scrolledToEnd ? 'scroll-fade-right' : ''}`}
        style={{ minHeight: 0, overflowY: 'auto', overflowX: 'scroll' }}
      >
        {/* Inner div fills the container but never shrinks below the columns'
            combined width (then the container scrolls horizontally). */}
        <div style={{ minWidth: totalWidth }}>
          <table
            className="border-collapse w-full"
            style={{ tableLayout: 'fixed', minWidth: totalWidth }}
          >
            <colgroup>
              {colDefs.map(c => (
                <col key={c.key} style={{ width: colWidths[c.key] ?? c.defaultWidth }} />
              ))}
            </colgroup>

            <thead className="sticky top-0 bg-[#f7f8ff] dark:bg-[#06060f] z-10 border-b border-[#dde0f0] dark:border-[#1e1e38]">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-[#1e1e38] dark:text-[#dde0f0]">

                <Th colKey="provider"       sortKey="provider"       label="Provider" />
                <Th colKey="instance_type"  sortKey="instance_type"  label={<span title={skuTooltip} style={{ cursor: 'help' }}>Product <span style={{ opacity: 0.45, fontWeight: 400 }}>ⓘ</span></span>} />

                {/* ── Product-type-specific middle columns ── */}
                {activeProductType === 'database' ? (<>
                  <Th colKey="engine_category"    sortKey="attributes.engine"          label="Engine" />
                  <Th colKey="db_family_cpu_vendor" sortKey="category"                 label="Database Family" />
                  <Th colKey="deployment_arch"    sortKey="attributes.deployment_type" label="Deployment" />
                  <Th colKey="ha_mode_os"         sortKey="attributes.ha_mode"         label="HA Mode" />
                </>) : activeProductType === 'data-analytics' ? (<>
                  <Th colKey="engine_category"    sortKey="attributes.engine"          label="Engine" />
                  <Th colKey="deployment_arch"    sortKey="attributes.deployment_type" label="Deployment Type" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.tier"          label="Tier" />
                  <Th colKey="vcpus"              sortKey="vcpus"                      label="Compute Unit" />
                </>) : activeProductType === 'ai' ? (<>
                  <Th colKey="engine_category"    sortKey="service"                    label="Service" />
                  <Th colKey="deployment_arch"    sortKey="attributes.modelTier"       label="Model Tier" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.contextWindowK" label={<>Context<br/>Window</>} />
                  <Th colKey="ha_mode_os"         sortKey="attributes.multimodal"      label="Multimodal" />
                </>) : activeProductType === 'serverless' ? (<>
                  <Th colKey="svc_type"           sortKey="attributes.service_type" label="Service Type" />
                  <Th colKey="arch"               sortKey="arch"      label="Arch" />
                  <Th colKey="languages"          sortKey="attributes.supportedLanguages"           label="Languages" />
                  <Th colKey="engine_category"    sortKey="attributes.cold_start_overhead_ms"       label="Cold Start (ms)" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.timeout_seconds"              label="Timeout (sec)" />
                  <Th colKey="deployment_arch"    sortKey="attributes.memory_configuration"         label="Memory Config" />
                  <Th colKey="ha_mode_os"         sortKey="attributes.free_invocations_per_month"   label="Free Tier" />
                  <Th colKey="granularity"        sortKey="attributes.billing_granularity_ms"       label="Granularity (ms)" />
                  <Th colKey="exec_model"         sortKey="attributes.execution_model"              label="Exec. Model" />
                  <Th colKey="prov_concurrency"   sortKey="attributes.provisioned_concurrency_support" label="Prov. Concurrency" />
                  <Th colKey="max_storage"        sortKey="attributes.max_ephemeral_storage_gb"     label="Max Storage (GB)" />
                  <Th colKey="inv_price"          sortKey="attributes.invocation_price_per_1m"      label="Inv. Price ($/1M)" />
                </>) : activeProductType === 'containers' ? (<>
                  <Th colKey="engine_category"    sortKey="attributes.orchestrator"      label="Orchestrator" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.compute_type"      label="Compute Type" />
                  <Th colKey="deployment_arch"    sortKey="attributes.architecture"      label="Architecture" />
                  <Th colKey="ha_mode_os"         sortKey="attributes.billing_granularity" label="Granularity" />
                </>) : activeProductType === 'networking' ? (<>
                  <Th colKey="engine_category"    sortKey="service"                  label="Service" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.billing_model" label="Billing Model" />
                  <Th colKey="deployment_arch"    sortKey="attributes.usage_tier"    label="Usage Tier" />
                  <Th colKey="ha_mode_os"         sortKey="attributes.port_capacity" label="Port Capacity" />
                  <Th colKey="gpu"                sortKey="attributes.transfer_scope" label="Transfer Scope" />
                </>) : activeProductType === 'storage' ? (<>
                  <Th colKey="engine_category"    sortKey="attributes.storage_type" label="Type" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.tier"        label="Tier" />
                  <Th colKey="deployment_arch"    sortKey="attributes.redundancy"  label="Redundancy" />
                  <Th colKey="ha_mode_os"         sortKey="attributes.media"       label="Media" />
                </>) : activeProductType === 'app-hosting' ? (<>
                  <Th colKey="engine_category"    sortKey="attributes.tier"         label="Tier" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.compute_type" label="Compute Type" />
                  <Th colKey="ha_mode_os"         sortKey="os"                      label="OS" />
                </>) : activeProductType === 'security' ? (<>
                  <Th colKey="db_family_cpu_vendor" label="Domain" />
                  <Th colKey="engine_category"    sortKey="category"   label="Service" />
                </>) : activeProductType === 'integration' ? (<>
                  <Th colKey="engine_category"    sortKey="attributes.service_type" label="Service Type" />
                  <Th colKey="deployment_arch"    sortKey="attributes.pricing_model"  label="Pricing Model" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.tier"         label="Tier" />
                  <Th colKey="ha_mode_os"         sortKey="attributes.max_message_size_kb" label="Max Msg Size" />
                  <Th colKey="gpu"                sortKey="attributes.protocols"      label="Protocols" />
                </>) : activeProductType === 'gpu' ? (<>
                  <Th colKey="engine_category"    sortKey="attributes.gpu_model"   label="GPU Model" />
                  <Th colKey="gpu_vendor"         sortKey="attributes.gpu_vendor"  label="GPU Vendor" />
                  <Th colKey="db_family_cpu_vendor" sortKey="attributes.gpu_vram_gb" label="VRAM/GPU (GB)" />
                  <Th colKey="ha_mode_os"         sortKey="os"         label="OS" />
                  <Th colKey="gpu"                sortKey="gpu_count"  label="GPU Count" />
                </>) : (<>
                  {/* vm (default) */}
                  <Th colKey="engine_category"    sortKey="category"   label="Category" />
                  <Th colKey="db_family_cpu_vendor" sortKey="cpu_vendor" label="CPU Vendor" />
                  <Th colKey="deployment_arch"    sortKey="arch"       label="Arch" />
                  <Th colKey="ha_mode_os"         sortKey="os"         label="OS" />
                  <Th colKey="gpu"                sortKey="gpu_count"  label="GPU" />
                </>)}

                {activeProductType !== 'ai' && <Th colKey="geography" sortKey="geography" label="Geo" />}

                {activeProductType !== 'networking' && activeProductType !== 'data-analytics' && activeProductType !== 'ai' && activeProductType !== 'storage' && activeProductType !== 'security' && activeProductType !== 'integration' && (<>
                  <Th colKey="vcpus"     sortKey="vcpus"     label="vCPU" />
                  <Th colKey="memory_gb" sortKey="memory_gb" label="Memory (GB)" />
                </>)}

                {(activeProductType === 'serverless' || activeProductType === 'integration') && <Th colKey="unit" sortKey="unit" label="Pricing Unit" />}

                <Th
                  colKey="price_per_unit"
                  sortKey="price_per_unit"
                  label={activeProductType === 'ai' ? <>Input<br/>Price</> : activeProductType === 'integration' ? 'Native Price ($)' : activeProductType === 'serverless' ? 'Price ($)' : (showAggregation ? 'Yearly price ($)' : 'Hourly price ($)')}
                  className="text-black dark:text-[#f7f8ff] hover:opacity-80"
                />

                {activeProductType === 'integration' && <Th colKey="norm_price" sortKey="attributes.normalized_price_per_1m" label="Comparable ($/1M ops)" />}

                {activeProductType === 'serverless' && <Th colKey="source" sortKey="data_source" label="Source" />}
                {activeProductType === 'ai' && <Th colKey="inv_price" sortKey="attributes.outputPricePer1M" label={<>Output<br/>Price</>} />}
                {activeProductType !== 'serverless' && activeProductType !== 'ai' && <Th colKey="source" sortKey="data_source" label="Source" />}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#dde0f0] dark:divide-[#181818]">
              {loading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {colDefs.map(c => (
                      <td key={c.key} className="px-6 py-4">
                        <div className="h-3 bg-[#dde0f0] dark:bg-[#1e1e38] rounded w-12 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length > 0 ? (
                <>
                  {padTop > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={colDefs.length} style={{ height: padTop, padding: 0, border: 0 }} />
                    </tr>
                  )}
                  {data.slice(rowStart, rowEnd).map((record, i) => {
                    const index = rowStart + i;
                    return (
                      <TableRow
                        key={`${record.provider}-${record.instance_type}-${record.geography}-${index}`}
                        record={record}
                        index={index}
                        activeProductType={activeProductType}
                        showAggregation={showAggregation}
                      />
                    );
                  })}
                  {padBottom > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={colDefs.length} style={{ height: padBottom, padding: 0, border: 0 }} />
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan={colDefs.length} className="px-6 py-32 text-center text-[#737373] dark:text-[#525252] italic text-sm">
                    <div className="flex flex-col items-center gap-4">
                      <span>No matches for your filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Table row ───────────────────────────────────────────────────────────────
function TableRow({
  record, index, activeProductType, showAggregation,
}: {
  record: PricingRecord;
  index: number;
  activeProductType: ProductType;
  showAggregation: boolean;
}) {
  const providerColor = PROVIDERS.find(
    p => (record.provider || '').toLowerCase() === p.id || record.provider === p.name,
  )?.color ?? '#525252';

  return (
    <tr className={`transition-colors group ${index % 2 === 0 ? 'bg-[#f7f8ff] dark:bg-[#06060f]' : 'bg-[#e8eaf8] dark:bg-[#10102a]'} hover:bg-[#eef2ff] dark:hover:bg-[#111827]`}>
      {/* Provider */}
      <td data-col="provider" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border" style={{ color: providerColor, borderColor: providerColor + '50', backgroundColor: providerColor + '18' }}>
          {record.provider}
        </span>
      </td>

      {/* SKU */}
      <td data-col="instance_type" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
        <span className="text-xs font-bold text-[#404040] dark:text-[#d4d4d4]" title={record.instance_type}>{formatInstanceName(record.instance_type, record.provider)}</span>
      </td>

      {/* Product-type-specific cells */}
      {activeProductType === 'database' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.engine || '—'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.category || '—'}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.deployment_type || 'Provisioned'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.ha_mode || '—'}</span></td>
      </>) : activeProductType === 'data-analytics' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.engine || '—'}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.deployment_type || 'Provisioned'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.tier || '—'}</span></td>
        <td data-col="vcpus"               className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.vcpus || '—'}</span></td>
      </>) : activeProductType === 'ai' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.service || '—'}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.modelTier || '—'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.contextWindowK || '—'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.multimodal || '—'}</span></td>
      </>) : activeProductType === 'serverless' ? (<>
        <td data-col="svc_type"            className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">
            {record.attributes?.service_type || 'Compute'}
          </span>
        </td>
        <td data-col="arch"                className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.arch === 'x86 64' ? 'x86' : (record.arch || '—')}</span></td>
        <td data-col="languages"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.supportedLanguages ? (Array.isArray(record.attributes.supportedLanguages) ? record.attributes.supportedLanguages.join(', ') : record.attributes.supportedLanguages) : '—'}</span></td>
        <td data-col="engine_category"     className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.cold_start_overhead_ms || '—'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.timeout_seconds || '—'}</span></td>
        <td data-col="deployment_arch"     className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.memory_configuration ? (String(record.attributes.memory_configuration).toLowerCase().includes('configurable') ? 'Configurable' : String(record.attributes.memory_configuration).toLowerCase().includes('tier') ? 'Tiers' : String(record.attributes.memory_configuration).toLowerCase().includes('auto') ? 'Automatic' : record.attributes.memory_configuration) : '—'}</span></td>
        <td data-col="ha_mode_os"          className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">{record.attributes?.service_type && record.attributes.service_type !== 'Compute' ? <span className="text-[10px] font-bold text-[#d4d4d4] dark:text-[#404040]">—</span> : <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.free_invocations_per_month && Number(record.attributes.free_invocations_per_month) > 0 ? 'Yes' : 'No'}</span>}</td>
        <td data-col="granularity"         className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.billing_granularity_ms || '—'}</span></td>
        <td data-col="exec_model"          className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.execution_model === 'Both' ? 'Code (ZIP), Container Image' : (record.attributes?.execution_model || '—')}</span></td>
        <td data-col="prov_concurrency"    className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">{record.attributes?.provisioned_concurrency_support ? <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes.provisioned_concurrency_support}</span> : <span className="text-[10px] font-bold text-[#d4d4d4] dark:text-[#404040]">—</span>}</td>
        <td data-col="max_storage"         className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.max_ephemeral_storage_gb || '—'}</span></td>
        <td data-col="inv_price"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.invocation_price_per_1m ? `$${Number(record.attributes.invocation_price_per_1m).toFixed(2)}` : '—'}</span>
          </div>
        </td>
      </>) : activeProductType === 'containers' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.orchestrator || '—'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.compute_type || '—'}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.architecture || '—'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.billing_granularity || '—'}</span></td>
      </>) : activeProductType === 'networking' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.service || '—'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.billing_model || '—'}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.usage_tier || '—'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.port_capacity || '—'}</span></td>
        <td data-col="gpu"                  className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.transfer_scope || '—'}</span></td>
      </>) : activeProductType === 'storage' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.storage_type === 'Object' ? 'Object (Blob)' : (record.attributes?.storage_type || '—')}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.tier || '—'}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.redundancy || '—'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.media || '—'}</span></td>
      </>) : activeProductType === 'app-hosting' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.tier || '—'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.compute_type || '—'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden font-bold text-[#737373] text-[10px] uppercase">{record.os || '—'}</td>
      </>) : activeProductType === 'security' ? (<>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.category || '—'}</span></td>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.service || '—'}</span></td>
      </>) : activeProductType === 'integration' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.service_type || '—'}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.pricing_model === 'usage' ? 'Usage' : record.attributes?.pricing_model === 'data' ? 'Data' : record.attributes?.pricing_model === 'flat' ? 'Flat' : (record.attributes?.pricing_model || '—')}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.tier || '—'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.max_message_size_kb ? (Number(record.attributes.max_message_size_kb) >= 1024 ? `${Number(record.attributes.max_message_size_kb) / 1024} MB` : `${record.attributes.max_message_size_kb} KB`) : '—'}</span></td>
        <td data-col="gpu"                  className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]" title={record.attributes?.protocols || ''}>{record.attributes?.protocols ? (record.attributes.protocols.length > 20 ? `${record.attributes.protocols.substring(0, 20)}...` : record.attributes.protocols) : '—'}</span></td>
      </>) : activeProductType === 'gpu' ? (<>
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.gpu_model || '—'}</span></td>
        <td data-col="gpu_vendor"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.gpu_vendor || '—'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.gpu_vram_gb || '—'}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden font-bold text-[#737373] text-[10px] uppercase">{record.os || '—'}</td>
        <td data-col="gpu"                  className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.gpu_count > 0 ? `${record.gpu_count}×` : '—'}</span></td>
      </>) : (<>
        {/* vm (default) */}
        <td data-col="engine_category"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.category || 'General purpose'}</span></td>
        <td data-col="db_family_cpu_vendor" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373] dark:text-[#a3a3a3]">{cpuVendorLabel(record.cpu_vendor)}</span></td>
        <td data-col="deployment_arch"      className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.arch === 'x86 64' ? 'x86' : (record.arch || '—')}</span></td>
        <td data-col="ha_mode_os"           className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden font-bold text-[#737373] text-[10px] uppercase">{record.os || '—'}</td>
        <td data-col="gpu"                  className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">{record.gpu_count > 0 ? <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">GPU</span> : <span className="text-[10px] font-bold text-[#d4d4d4] dark:text-[#404040]">—</span>}</td>
      </>)}

      {/* Geography */}
      {activeProductType !== 'ai' && (
        <td data-col="geography" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.geography || '—'}</span>
        </td>
      )}

      {/* vCPU + Memory (not shown for networking / data-analytics / ai / storage / security / integration) */}
      {activeProductType !== 'networking' && activeProductType !== 'data-analytics' && activeProductType !== 'ai' && activeProductType !== 'storage' && activeProductType !== 'security' && activeProductType !== 'integration' && (<>
        <td data-col="vcpus"     className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.vcpus || '—'}</span></td>
        <td data-col="memory_gb" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden"><span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.memory_gb || '—'}</span></td>
      </>)}

      {/* Pricing Unit (serverless + integration, since units vary widely: GB-Hour vs per 1M Requests vs Mo) */}
      {(activeProductType === 'serverless' || activeProductType === 'integration') && (
        <td data-col="unit" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{prettyUnit(record.unit) || '—'}</span>
        </td>
      )}

      {/* Price */}
      <td data-col="price_per_unit" className="px-6 py-4 text-center align-middle whitespace-nowrap overflow-hidden">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1">
            {(() => {
              const curr = parseFloat(record.price_per_unit);
              const prev = record.previous_price_per_unit != null ? parseFloat(record.previous_price_per_unit) : null;
              if (prev === null || prev === 0) return <span className="text-[10px] text-[#d4d4d4] dark:text-[#404040]" title="No previous price data">●</span>;
              if (curr > prev) return <span className="text-[10px] text-[#ef4444] font-bold leading-none" title={`Up from $${prev.toFixed(4)}`}>▲</span>;
              if (curr < prev) return <span className="text-[10px] text-[#22c55e] font-bold leading-none" title={`Down from $${prev.toFixed(4)}`}>▼</span>;
              return <span className="text-[10px] text-[#a3a3a3] font-bold leading-none" title="Unchanged since last ingest">●</span>;
            })()}
            <span className="text-xs font-bold text-black dark:text-[#f7f8ff]">
              {activeProductType === 'ai' || activeProductType === 'serverless' || activeProductType === 'integration' ? `$${parseFloat(record.price_per_unit).toFixed(4)}` : (showAggregation ? `$${(parseFloat(record.price_per_unit) * 8760).toFixed(2)}` : `$${parseFloat(record.price_per_unit).toFixed(4)}`)}
            </span>
          </div>
        </div>
      </td>

      {/* Comparable $/1M ops (integration only) — usage-based rows normalized to a
          common unit; flat/data-volume rows show their model badge since they
          can't be compared per-operation. */}
      {activeProductType === 'integration' && (
        <td data-col="norm_price" className="px-6 py-4 text-center align-middle whitespace-nowrap overflow-hidden">
          {(() => {
            const n = record.attributes?.normalized_price_per_1m;
            if (n != null) return <span className="text-xs font-bold text-black dark:text-[#f7f8ff]">${Number(n).toFixed(4)}</span>;
            const model = record.attributes?.pricing_model;
            const label = model === 'flat' ? 'Flat / mo' : model === 'data' ? 'Per volume' : '—';
            return (
              <span
                title="Different pricing model — not comparable on a per-operation basis"
                className="px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-widest bg-[#dde0f0] dark:bg-[#1e1e38] text-[#737373] dark:text-[#a3a3a3] border-[#dde0f0] dark:border-[#1e1e38]"
              >
                {label}
              </span>
            );
          })()}
        </td>
      )}

      {/* Source / Output Price */}
      {activeProductType === 'serverless' && (
        <td data-col="source" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-widest bg-[#dde0f0] dark:bg-[#1e1e38] text-[#737373] dark:text-[#a3a3a3] border-[#dde0f0] dark:border-[#1e1e38]">
            {record.data_source === 'static_config' ? 'Static' : 'API'}
          </span>
        </td>
      )}

      {activeProductType === 'ai' && (
        <td data-col="inv_price" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{record.attributes?.outputPricePer1M ? `$${Number(record.attributes.outputPricePer1M).toFixed(4)}` : '—'}</span>
        </td>
      )}

      {activeProductType !== 'serverless' && activeProductType !== 'ai' && (
        <td data-col="source" className="px-6 py-4 whitespace-nowrap text-center align-middle overflow-hidden">
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-widest bg-[#dde0f0] dark:bg-[#1e1e38] text-[#737373] dark:text-[#a3a3a3] border-[#dde0f0] dark:border-[#1e1e38]">
            {record.data_source === 'static_config' ? 'Static' : 'API'}
          </span>
        </td>
      )}
    </tr>
  );
}

// ─── Mobile card view ────────────────────────────────────────────────────────
// Mirrors the table columns as label/value pairs so the same data is shown on
// phones in a stacked, readable card instead of a wide horizontal-scroll table.
function getMobileFields(record: PricingRecord, pt: ProductType): { label: string; value: string }[] {
  const a: any = record.attributes || {};
  const dash = (v: any) => (v === undefined || v === null || v === '' || v === 0 ? '—' : String(v));
  const arch = record.arch === 'x86 64' ? 'x86' : (record.arch || '—');
  switch (pt) {
    case 'database': return [
      { label: 'Engine', value: dash(a.engine) },
      { label: 'Tier', value: dash(record.category) },
      { label: 'Deployment', value: a.deployment_type || 'Provisioned' },
      { label: 'HA Mode', value: dash(a.ha_mode) },
      { label: 'Geo', value: dash(record.geography) },
      { label: 'vCPU', value: dash(record.vcpus) },
      { label: 'Memory (GB)', value: dash(record.memory_gb) },
    ];
    case 'data-analytics': return [
      { label: 'Engine', value: dash(a.engine) },
      { label: 'Deployment Type', value: a.deployment_type || 'Provisioned' },
      { label: 'Tier', value: dash(a.tier) },
      { label: 'Compute Unit', value: dash(record.vcpus) },
      { label: 'Geo', value: dash(record.geography) },
    ];
    case 'ai': return [
      { label: 'Service', value: dash(record.service) },
      { label: 'Model Tier', value: dash(a.modelTier) },
      { label: 'Context Window', value: dash(a.contextWindowK) },
      { label: 'Multimodal', value: dash(a.multimodal) },
      { label: 'Output Price', value: a.outputPricePer1M ? `$${Number(a.outputPricePer1M).toFixed(4)}` : '—' },
    ];
    case 'serverless': return [
      { label: 'Service Type', value: a.service_type || 'Compute' },
      { label: 'Arch', value: arch },
      { label: 'Languages', value: a.supportedLanguages ? (Array.isArray(a.supportedLanguages) ? a.supportedLanguages.join(', ') : a.supportedLanguages) : '—' },
      { label: 'Cold Start (ms)', value: dash(a.cold_start_overhead_ms) },
      { label: 'Timeout (sec)', value: dash(a.timeout_seconds) },
      { label: 'Memory Config', value: dash(a.memory_configuration ? (String(a.memory_configuration).toLowerCase().includes('configurable') ? 'Configurable' : String(a.memory_configuration).toLowerCase().includes('tier') ? 'Tiers' : String(a.memory_configuration).toLowerCase().includes('auto') ? 'Automatic' : a.memory_configuration) : null) },
      { label: 'Free Tier', value: a.service_type && a.service_type !== 'Compute' ? '—' : (a.free_invocations_per_month && Number(a.free_invocations_per_month) > 0 ? 'Yes' : 'No') },
      { label: 'Granularity (ms)', value: dash(a.billing_granularity_ms) },
      { label: 'Exec. Model', value: dash(a.execution_model === 'Both' ? 'Code (ZIP), Container Image' : a.execution_model) },
      { label: 'Prov. Concurrency', value: a.provisioned_concurrency_support ? String(a.provisioned_concurrency_support) : '—' },
      { label: 'Max Storage (GB)', value: dash(a.max_ephemeral_storage_gb) },
      { label: 'Inv. Price ($/1M)', value: a.invocation_price_per_1m ? `$${Number(a.invocation_price_per_1m).toFixed(2)}` : '—' },
      { label: 'Geo', value: dash(record.geography) },
      { label: 'Pricing Unit', value: dash(prettyUnit(record.unit)) },
      { label: 'Source', value: record.data_source === 'static_config' ? 'Static' : 'API' },
    ];
    case 'containers': return [
      { label: 'Orchestrator', value: dash(a.orchestrator) },
      { label: 'Compute Type', value: dash(a.compute_type) },
      { label: 'Architecture', value: dash(a.architecture) },
      { label: 'Billing', value: dash(a.billing_granularity) },
      { label: 'GPU', value: record.gpu_count > 0 ? 'GPU' : '—' },
      { label: 'Geo', value: dash(record.geography) },
      { label: 'vCPU', value: dash(record.vcpus) },
      { label: 'Memory (GB)', value: dash(record.memory_gb) },
    ];
    case 'networking': return [
      { label: 'Service', value: dash(record.service) },
      { label: 'Billing Model', value: dash(a.billing_model) },
      { label: 'Usage Tier', value: dash(a.usage_tier) },
      { label: 'Port Capacity', value: dash(a.port_capacity) },
      { label: 'Transfer Scope', value: dash(a.transfer_scope) },
      { label: 'Geo', value: dash(record.geography) },
    ];
    case 'storage': return [
      { label: 'Storage Type', value: dash(a.storage_type === 'Object' ? 'Object (Blob)' : a.storage_type) },
      { label: 'Tier', value: dash(a.tier) },
      { label: 'Redundancy', value: dash(a.redundancy) },
      { label: 'Media', value: dash(a.media) },
      { label: 'Geo', value: dash(record.geography) },
    ];
    case 'app-hosting': return [
      { label: 'Tier', value: dash(a.tier) },
      { label: 'Compute Type', value: dash(a.compute_type) },
      { label: 'OS', value: dash(record.os) },
      { label: 'Geo', value: dash(record.geography) },
      { label: 'vCPU', value: dash(record.vcpus) },
      { label: 'Memory (GB)', value: dash(record.memory_gb) },
    ];
    case 'security': return [
      { label: 'Domain', value: dash(record.category) },
      { label: 'Service', value: dash(record.service) },
      { label: 'Geo', value: dash(record.geography) },
    ];
    case 'integration': return [
      { label: 'Service Type', value: dash(a.service_type) },
      { label: 'Pricing Model', value: dash(a.pricing_model === 'usage' ? 'Usage' : a.pricing_model === 'data' ? 'Data' : a.pricing_model === 'flat' ? 'Flat' : a.pricing_model) },
      { label: 'Tier', value: dash(a.tier) },
      { label: 'Max Msg Size', value: a.max_message_size_kb ? (Number(a.max_message_size_kb) >= 1024 ? `${Number(a.max_message_size_kb) / 1024} MB` : `${a.max_message_size_kb} KB`) : '—' },
      { label: 'Protocols', value: dash(a.protocols) },
      { label: 'Geo', value: dash(record.geography) },
      { label: 'Pricing Unit', value: dash(prettyUnit(record.unit)) },
    ];
    default: return [ // vm
      { label: 'Category', value: record.category || 'General purpose' },
      { label: 'CPU Vendor', value: cpuVendorLabel(record.cpu_vendor) },
      { label: 'Arch', value: arch },
      { label: 'OS', value: dash(record.os) },
      { label: 'GPU', value: record.gpu_count > 0 ? 'GPU' : '—' },
      { label: 'Geo', value: dash(record.geography) },
      { label: 'vCPU', value: dash(record.vcpus) },
      { label: 'Memory (GB)', value: dash(record.memory_gb) },
    ];
  }
}

function MobileCard({
  record, activeProductType, showAggregation,
}: {
  record: PricingRecord;
  activeProductType: ProductType;
  showAggregation: boolean;
}) {
  const [open, setOpen] = useState(false);
  const providerColor = PROVIDERS.find(
    p => (record.provider || '').toLowerCase() === p.id || record.provider === p.name,
  )?.color ?? '#525252';

  const fields = getMobileFields(record, activeProductType);
  const visible = open ? fields : fields.slice(0, 4);

  const curr = parseFloat(record.price_per_unit);
  const prev = record.previous_price_per_unit != null ? parseFloat(record.previous_price_per_unit) : null;
  const trend = (prev === null || prev === 0)
    ? null
    : curr > prev ? <span className="text-[#ef4444] font-bold">▲</span>
    : curr < prev ? <span className="text-[#22c55e] font-bold">▼</span>
    : <span className="text-[#a3a3a3] font-bold">●</span>;

  const priceVal = activeProductType === 'ai' || activeProductType === 'serverless'
    ? `$${curr.toFixed(4)}`
    : showAggregation ? `$${(curr * 8760).toFixed(2)}` : `$${curr.toFixed(4)}`;
  const priceUnit = activeProductType === 'ai' ? '/1M tokens'
    : activeProductType === 'serverless' ? (record.unit || '')
    : showAggregation ? '/yr' : '/hr';

  return (
    <div className="border border-[#dde0f0] dark:border-[#1e1e38] rounded-lg bg-white dark:bg-[#0a0a18] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border w-fit"
            style={{ color: providerColor, borderColor: providerColor + '50', backgroundColor: providerColor + '18' }}
          >
            {record.provider}
          </span>
          <span className="text-sm font-bold text-[#404040] dark:text-[#d4d4d4] break-words" title={record.instance_type}>
            {formatInstanceName(record.instance_type, record.provider)}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 text-base font-bold text-black dark:text-[#f7f8ff]">
            {trend}{priceVal}
          </div>
          <div className="text-[9px] text-[#737373] uppercase tracking-widest">{priceUnit}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {visible.map(f => (
          <div key={f.label} className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#a3a3a3]">{f.label}</span>
            <span className="text-[11px] font-semibold text-[#404040] dark:text-[#d4d4d4] break-words">{f.value}</span>
          </div>
        ))}
      </div>

      {fields.length > 4 && (
        <button
          onClick={() => setOpen(o => !o)}
          className="mt-3 w-full text-[11px] font-bold text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] border-t border-[#dde0f0] dark:border-[#1e1e38] pt-2 transition-colors"
        >
          {open ? 'Show less' : `Show ${fields.length - 4} more`}
        </button>
      )}
    </div>
  );
}
