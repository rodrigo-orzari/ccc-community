'use client';

import React from 'react';
import { Search, Download, SlidersHorizontal } from 'lucide-react';

interface TableToolbarProps {
  totalFilteredCount: number;
  dataLength: number;
  search: string;
  onSearchChange: (value: string) => void;
  onExport: () => void;
  isExporting?: boolean;
  viewMode?: 'table' | 'charts';
  onViewModeChange?: (mode: 'table' | 'charts') => void;
  /** Opens the filter drawer on mobile. When provided, a "Filters" button is shown below lg. */
  onOpenFilters?: () => void;
  lastUpdated?: string;
}

export default function TableToolbar({
  totalFilteredCount,
  dataLength,
  search,
  onSearchChange,
  onExport,
  isExporting = false,
  viewMode = 'table',
  onViewModeChange,
  onOpenFilters,
  lastUpdated,
}: TableToolbarProps) {
  return (
    <div className="px-4 py-3 flex items-center bg-[#f7f8ff] dark:bg-[#06060f] border-b border-[#dde0f0] dark:border-[#1e1e38]">
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
        {onOpenFilters && (
          <button
            onClick={onOpenFilters}
            className="lg:hidden flex items-center gap-2 text-xs font-bold text-[#1e1e38] dark:text-[#f7f8ff] border border-[#dde0f0] dark:border-[#1e1e38] bg-[#dde0f0] dark:bg-[#1e1e38] px-3 py-2 rounded shrink-0"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
        )}
        <span className="text-xl font-bold text-black dark:text-[#f7f8ff] shrink-0">
          {totalFilteredCount.toLocaleString()}
          {totalFilteredCount > dataLength && dataLength > 0 && (
            <span className="ml-2 text-[10px] font-normal text-[#a3a3a3]">(top {dataLength.toLocaleString()} shown)</span>
          )}
        </span>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#dde0f0] dark:bg-[#1e1e38] border border-[#dde0f0] dark:border-[#1e1e38] rounded px-10 py-2 text-xs w-48 md:w-64 focus:outline-none focus:border-black/10 dark:focus:border-[#f7f8ff]/20 transition-all placeholder:text-[#a3a3a3]"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {viewMode === 'table' && (
            <div className="flex items-center gap-3 text-[10px] text-[#a3a3a3] dark:text-[#525252] hidden sm:flex">
              <span>Click a column header to sort</span>
              {lastUpdated && <span>•</span>}
              {lastUpdated && <span>Last updated: {lastUpdated}</span>}
            </div>
          )}
          
          {onViewModeChange && (
            <div className="flex bg-[#dde0f0] dark:bg-[#1e1e38] rounded-lg p-0.5 border border-[#dde0f0] dark:border-[#1e1e38]">
              <button
                onClick={() => onViewModeChange('table')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-[#f7f8ff] dark:bg-[#1e1e38] text-black dark:text-[#f7f8ff] shadow-sm' : 'text-[#737373] hover:text-black dark:hover:text-[#f7f8ff]'}`}
              >
                🗄️ Table
              </button>
              <button
                onClick={() => onViewModeChange('charts')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'charts' ? 'bg-[#f7f8ff] dark:bg-[#1e1e38] text-black dark:text-[#f7f8ff] shadow-sm' : 'text-[#737373] hover:text-black dark:hover:text-[#f7f8ff]'}`}
              >
                📊 Charts
              </button>
            </div>
          )}

          {/* Price change legend */}
          <div className="hidden md:flex items-center gap-2 text-[10px] text-[#a3a3a3] dark:text-[#525252] border border-[#dde0f0] dark:border-[#1e1e38] px-3 py-1.5 rounded">
            <span title="Price increased since last ingest" className="text-[#ef4444] font-bold">▲</span>
            <span title="Price decreased since last ingest" className="text-[#22c55e] font-bold">▼</span>
            <span title="Price unchanged since last ingest" className="text-[#a3a3a3] font-bold">●</span>
            <span className="ml-0.5">vs last ingest</span>
          </div>

          <button
            onClick={onExport}
            disabled={dataLength === 0 || isExporting}
            className="flex items-center gap-2 text-[10px] font-bold text-[#737373] dark:text-[#a3a3a3] border border-[#dde0f0] dark:border-[#1e1e38] px-3 py-1.5 rounded hover:bg-[#dde0f0] dark:hover:bg-[#1e1e38] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={12} /> {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
