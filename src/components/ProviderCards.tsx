'use client';

import React from 'react';

interface ProviderCardProps {
  id: string;
  name: string;
  color: string;
  soon?: boolean;
  isSelected: boolean;
  displayCount: number;
  onSelect: (providerId: string, soon?: boolean) => void;
}

interface DBStatusProvider {
  slug: string;
  count: string | number;
}

interface ProviderCardsProps {
  providers: { id: string; name: string; color: string; soon?: boolean; providerType?: 'hyperscaler' | 'specialized' }[];
  selectedProviders: string[];
  providerCounts: Record<string, number>;
  dbStatusProviders?: DBStatusProvider[];
  isInitialFetch?: boolean;
  onProviderSelect: (providerId: string) => void;
}

export default function ProviderCards({
  providers,
  selectedProviders,
  providerCounts,
  dbStatusProviders = [],
  isInitialFetch = false,
  onProviderSelect,
}: ProviderCardsProps) {
  const activeNonSoon = providers.filter(p => !p.soon).map(p => p.id);

  const renderGrid = (group: typeof providers) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-px bg-[#dde0f0] dark:bg-[#1e1e38] border border-[#dde0f0] dark:border-[#1e1e38] rounded-lg">
      {[...group]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => {
          // Additive filtering: an empty selection means "no provider constraint", so
          // every card counts as selected. Checking `length === activeNonSoon.length`
          // alone would read an empty selection as "nothing selected" and zero out
          // every card while the table below still shows all rows.
          const isSelected =
            selectedProviders.length === 0 ||
            selectedProviders.length === activeNonSoon.length ||
            selectedProviders.includes(p.id);
          const filteredCount = providerCounts[p.id];
          const dbProvider = dbStatusProviders?.find(dp => dp.slug === p.id || dp.slug === p.name.toLowerCase());
          const dbCount = dbProvider ? (typeof dbProvider.count === 'string' ? parseInt(dbProvider.count) : dbProvider.count) : 0;
          const displayCount = isSelected ? (isInitialFetch ? dbCount : filteredCount || 0) : 0;

          return (
            <button
              key={p.id}
              onClick={() => onProviderSelect(p.id)}
              title={isSelected ? `Click to show only ${p.name}` : `Click to include ${p.name}`}
              className="text-left px-2.5 py-2.5 bg-white dark:bg-[#0a0a18] cursor-pointer transition-colors hover:bg-[#f7f8ff] dark:hover:bg-[#10102a]"
            >
              <div className={isSelected ? '' : 'opacity-40'}>
                <div
                  className="text-[9px] font-bold uppercase tracking-widest mb-1 truncate"
                  style={{ color: p.color }}
                >
                  {p.name}
                </div>
                <div className="text-xl font-black leading-none text-[#1a1a2e] dark:text-[#f7f8ff] tabular-nums">
                  {displayCount.toLocaleString()}
                </div>
              </div>
            </button>
          );
        })}
    </div>
  );

  const nonSoon = providers.filter(p => !p.soon);

  return (
    <div className="px-4 py-3 lg:px-6 lg:py-4 bg-white dark:bg-[#0a0a18]">
      {nonSoon.length > 0 && renderGrid(nonSoon)}
    </div>
  );
}
