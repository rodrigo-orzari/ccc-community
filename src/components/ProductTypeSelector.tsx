'use client';

import React from 'react';
import type { ProductType } from '@/types';

const PRODUCT_TYPES: { id: ProductType; label: string; emoji: string; soon?: boolean }[] = [
  { id: 'ai', label: 'Artificial Intelligence', emoji: '🧠' },
  { id: 'app-hosting', label: 'App Hosting', emoji: '🚀' },
  { id: 'containers', label: 'Containers', emoji: '📦' },
  { id: 'data-analytics', label: 'Data & Analytics', emoji: '📊' },
  { id: 'database', label: 'Databases', emoji: '🗄️' },
  { id: 'gpu', label: 'GPU', emoji: '🎮' },
  { id: 'integration', label: 'Integration', emoji: '🔌' },
  { id: 'networking', label: 'Networking', emoji: '🌐' },
  { id: 'security', label: 'Security & Identity', emoji: '🛡️' },
  { id: 'serverless', label: 'Serverless', emoji: '⚡' },
  { id: 'storage', label: 'Storage', emoji: '💾' },
  { id: 'vm', label: 'Virtual Machines', emoji: '🖥️' },
];

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

import Link from 'next/link';

interface ProductTypeSelectorProps {
  activeProductType?: ProductType | null;
  onProductTypeChange?: (type: ProductType) => void;
}

export default function ProductTypeSelector({
  activeProductType,
  onProductTypeChange,
}: ProductTypeSelectorProps) {
  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const shareOnX = () => {
    // SHARE_TEXT already contains the domain so we skip the separate `url` param
    // to avoid the link appearing twice (once inline, once as a t.co append).
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  return (
    <div className="h-[44px] sticky top-0 z-50 border-b border-[#dde0f0] dark:border-[#1e1e38] bg-[#eef0fc] dark:bg-[#0c0c1e] flex items-center justify-start lg:justify-center px-3 lg:px-[1.5rem] overflow-x-auto no-scrollbar shrink-0">
      <div className="flex items-center gap-3 lg:gap-6 w-max justify-start lg:justify-center">
        {PRODUCT_TYPES.map(product => {
          const href = `/?product=${product.id === 'vm' ? 'compute' : product.id}`;
          return (
            <Link
              key={product.id}
              href={product.soon ? '#' : href}
              onClick={(e) => {
                if (product.soon) {
                  e.preventDefault();
                  return;
                }
                if (onProductTypeChange) {
                  e.preventDefault();
                  onProductTypeChange(product.id);
                  window.history.pushState({}, '', href);
                }
              }}
              className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-1 rounded border transition-all ${
                activeProductType === product.id
                  ? 'bg-[#f7f8ff] dark:bg-[#1e1e38] shadow-sm border-[#dde0f0] dark:border-[#1e1e38] cursor-default'
                  : 'border-transparent text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] opacity-60 hover:opacity-100'
              } ${product.soon ? 'cursor-not-allowed opacity-60' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <span className={`text-xs font-bold flex flex-col items-center gap-0.5 ${activeProductType !== product.id ? 'font-medium' : ''}`}>
                <span>{product.emoji}</span>
                <span className="text-[10px] leading-tight">{product.label}</span>
              </span>
              {product.soon && (
                <span className="text-[8px] font-bold bg-[#dde0f0] dark:bg-[#1e1e38] border border-[#dde0f0] dark:border-[#1e1e38] px-1 rounded uppercase tracking-tighter">
                  Soon
                </span>
              )}
            </Link>
          );
        })}

        <Link
          href="/compliance"
          className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${
            activeProductType === 'compliance' as any
              ? 'bg-[#f7f8ff] dark:bg-[#1e1e38] shadow-sm border-[#dde0f0] dark:border-[#1e1e38] cursor-default'
              : 'border-transparent text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] opacity-60 hover:opacity-100'
          }`}
          style={{ textDecoration: 'none' }}
        >
          <span className={`text-xs font-bold flex flex-col items-center gap-0.5 ${activeProductType !== 'compliance' as any ? 'font-medium' : ''}`}>
            <span>📜</span>
            <span className="text-[10px] leading-tight">Compliance</span>
          </span>
        </Link>

        <Link
          href="/datacenters"
          className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${
            activeProductType === 'datacenters' as any
              ? 'bg-[#f7f8ff] dark:bg-[#1e1e38] shadow-sm border-[#dde0f0] dark:border-[#1e1e38] cursor-default'
              : 'border-transparent text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] opacity-60 hover:opacity-100'
          }`}
          style={{ textDecoration: 'none' }}
        >
          <span className={`text-xs font-bold flex flex-col items-center gap-0.5 ${activeProductType !== 'datacenters' as any ? 'font-medium' : ''}`}>
            <span>🏢</span>
            <span className="text-[10px] leading-tight">Datacenters</span>
          </span>
        </Link>

        <Link
          href="/workloads"
          className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${
            activeProductType === 'workloads' as any
              ? 'bg-[#f7f8ff] dark:bg-[#1e1e38] shadow-sm border-[#dde0f0] dark:border-[#1e1e38] cursor-default'
              : 'border-transparent text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] opacity-60 hover:opacity-100'
          }`}
          style={{ textDecoration: 'none' }}
        >
          <span className={`text-xs font-bold flex flex-col items-center gap-0.5 ${activeProductType !== 'workloads' as any ? 'font-medium' : ''}`}>
            <span>📦</span>
            <span className="text-[10px] leading-tight">Workloads</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
