'use client';

import React, { useMemo } from 'react';
import type { PricingRecord, ProductType } from '@/types';
import * as staticConfig from '@/config';

interface CategorySummaryTableProps {
  data: PricingRecord[];
  activeProductType: ProductType;
  loading?: boolean;
}

// Compact per-provider price summary: one representative (cheapest) row per
// provider for the active category, condensed to Provider | Service | Price.
export default function CategorySummaryTable({ data, activeProductType, loading }: CategorySummaryTableProps) {
  // Hyperscalers first, then specialized providers, alphabetical within each —
  // see compareProvidersForDisplay. Copy before sorting: providersForType()
  // returns a filtered view over the shared PROVIDERS config.
  const providers = [...staticConfig.providersForType(activeProductType)]
    .sort(staticConfig.compareProvidersForDisplay);

  const rows = useMemo(() => {
    const cheapestByProvider = new Map<string, PricingRecord>();
    for (const record of data) {
      const price = parseFloat(record.price_per_unit);
      if (Number.isNaN(price)) continue;
      const existing = cheapestByProvider.get(record.provider);
      if (!existing || price < parseFloat(existing.price_per_unit)) {
        cheapestByProvider.set(record.provider, record);
      }
    }
    return providers
      .filter(p => !p.soon)
      .map(p => ({ provider: p, record: cheapestByProvider.get(p.id) }))
      .filter(r => r.record);
  }, [data, providers]);

  if (loading || rows.length === 0) return null;

  return (
    <div className="mx-3 lg:mx-6 mt-3 mb-1 border border-[#dde0f0] dark:border-[#1e1e38] rounded overflow-hidden shrink-0">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#eef0fc] dark:bg-[#0c0c1e] border-b border-[#dde0f0] dark:border-[#1e1e38]">
            <th className="text-left font-bold uppercase tracking-widest text-[10px] text-[#737373] px-3 py-2">Provider</th>
            <th className="text-left font-bold uppercase tracking-widest text-[10px] text-[#737373] px-3 py-2">Service</th>
            <th className="text-right font-bold uppercase tracking-widest text-[10px] text-[#737373] px-3 py-2">Price (from)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ provider, record }) => (
            <tr key={provider.id} className="border-b last:border-b-0 border-[#dde0f0] dark:border-[#1e1e38]">
              <td className="px-3 py-1.5 font-bold flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: provider.color }} />
                {provider.name}
              </td>
              <td className="px-3 py-1.5 text-[#737373]">{record!.service}</td>
              <td className="px-3 py-1.5 text-right font-bold">
                ${parseFloat(record!.price_per_unit).toFixed(4)} <span className="text-[#737373] font-normal">/{record!.unit}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
