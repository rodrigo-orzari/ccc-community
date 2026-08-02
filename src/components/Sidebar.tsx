'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Rocket,
  Package,
  BarChart3,
  Database,
  Cpu,
  Plug,
  Network,
  ShieldCheck,
  Zap,
  HardDrive,
  Server,
  ScrollText,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  Receipt,
  Calculator,
  Layers,
  PieChart,
  Bot,
} from 'lucide-react';
import type { ProductType } from '@/types';

const STORAGE_KEY = 'ccc-sidebar-collapsed';

const PRODUCT_TYPES: { id: ProductType | 'workloads'; label: string; icon: React.ComponentType<{ size?: number }>; soon?: boolean; href?: string }[] = [
  { id: 'ai', label: 'Artificial Intelligence', icon: Brain },
  { id: 'app-hosting', label: 'App Hosting', icon: Rocket },
  { id: 'containers', label: 'Containers', icon: Package },
  { id: 'data-analytics', label: 'Data & Analytics', icon: BarChart3 },
  { id: 'database', label: 'Databases', icon: Database },
  { id: 'gpu', label: 'GPU', icon: Cpu },
  { id: 'integration', label: 'Integration', icon: Plug },
  { id: 'networking', label: 'Networking', icon: Network },
  { id: 'security', label: 'Security & Identity', icon: ShieldCheck },
  { id: 'serverless', label: 'Serverless', icon: Zap },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'vm', label: 'Virtual Machines', icon: Server },
  { id: 'workloads', label: 'Workloads', icon: Package, href: '/workloads' },
];

const EXTRA_LINKS: { id: string; label: string; href: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'compliance', label: 'Compliance', href: '/compliance', icon: ScrollText },
  { id: 'datacenters', label: 'Datacenters', href: '/datacenters', icon: Building2 },
];

// Shared icon set so every page that used to show the old emoji per category/link
// can render the exact same icon as the sidebar, keeping the whole site consistent.
// Keyed by ProductType id (product categories) plus the extra link ids.
export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;

export const PRODUCT_TYPE_ICONS: Record<ProductType, IconComponent> = {
  ai: Brain,
  'app-hosting': Rocket,
  containers: Package,
  'data-analytics': BarChart3,
  database: Database,
  gpu: Cpu,
  integration: Plug,
  networking: Network,
  security: ShieldCheck,
  serverless: Zap,
  storage: HardDrive,
  vm: Server,
};

// Same keying as PRODUCT_TYPE_ICONS, split out so pages that need the label
// alone (e.g. a workloads category filter) don't have to import icon
// components just to read display names.
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  ai: 'Artificial Intelligence',
  'app-hosting': 'App Hosting',
  containers: 'Containers',
  'data-analytics': 'Data & Analytics',
  database: 'Databases',
  gpu: 'GPU',
  integration: 'Integration',
  networking: 'Networking',
  security: 'Security & Identity',
  serverless: 'Serverless',
  storage: 'Storage',
  vm: 'Virtual Machines',
};

export const EXTRA_LINK_ICONS: Record<string, IconComponent> = {
  workloads: Package,
  compliance: ScrollText,
  datacenters: Building2,
};

interface SidebarProps {
  activeProductType?: ProductType | null;
  onProductTypeChange?: (type: ProductType) => void;
}

export default function Sidebar({ activeProductType, onProductTypeChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch {
      // ignore (private browsing / disabled storage)
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const renderLink = (
    id: string,
    label: string,
    href: string,
    Icon: React.ComponentType<{ size?: number }>,
    isActive: boolean,
    onClick?: (e: React.MouseEvent) => void,
    soon?: boolean,
    external?: boolean,
    wrap?: boolean
  ) => {
    const className = `flex ${wrap ? 'items-start' : 'items-center'} gap-3 rounded px-2.5 py-2 text-xs font-bold transition-all border ${
      isActive
        ? 'bg-[#f7f8ff] dark:bg-[#1e1e38] shadow-sm border-[#dde0f0] dark:border-[#1e1e38]'
        : 'border-transparent text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] opacity-70 hover:opacity-100'
    } ${collapsed ? 'justify-center' : ''}`;

    const content = (
      <>
        <span className={`shrink-0 ${wrap ? 'mt-0.5' : ''}`}>
          <Icon size={16} />
        </span>
        {!collapsed && (
          <span className={wrap ? 'leading-tight min-w-0 flex-1' : 'whitespace-nowrap overflow-hidden text-ellipsis'}>
            {label}
          </span>
        )}
        {!collapsed && soon && (
          <span className={`text-[8px] font-bold bg-[#dde0f0] dark:bg-[#1e1e38] border border-[#dde0f0] dark:border-[#1e1e38] px-1 rounded uppercase tracking-tighter text-[#2563eb] dark:text-[#818cf8] shrink-0 ${wrap ? '' : 'ml-auto'}`}>
            Soon
          </span>
        )}
      </>
    );

    if (external) {
      return (
        <a
          key={id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? label : undefined}
          className={className}
          style={{ textDecoration: 'none' }}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={id}
        href={href}
        onClick={(e) => {
          onClick?.(e);
          setMobileOpen(false);
        }}
        title={collapsed ? label : undefined}
        className={className}
        style={{ textDecoration: 'none' }}
      >
        {content}
      </Link>
    );
  };

  const navContent = (
    <>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-end'} px-2 py-3 relative`}>
        {!collapsed && <span className="absolute left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-widest text-[#737373]">Categories</span>}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="hidden lg:flex items-center justify-center p-1.5 rounded text-[#737373] hover:text-black dark:hover:text-[#f7f8ff] hover:bg-[#dde0f0] dark:hover:bg-[#1e1e38] transition-colors"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2 pb-2 overflow-y-auto no-scrollbar">
        {PRODUCT_TYPES.map(product => {
          const href = product.href || `/?product=${product.id === 'vm' ? 'compute' : product.id}`;
          return renderLink(
            product.id,
            product.label,
            href,
            product.icon,
            activeProductType === product.id as any,
            product.href ? undefined : (e) => {
              if (onProductTypeChange) {
                e.preventDefault();
                onProductTypeChange(product.id as ProductType);
                window.history.pushState({}, '', href);
              }
            },
            product.soon
          );
        })}

        <div className="h-px bg-[#c3c8e8] dark:bg-[#1e1e38] my-2 mx-1" />

        {EXTRA_LINKS.map(link =>
          renderLink(link.id, link.label, link.href, link.icon, activeProductType === (link.id as any))
        )}

        <div className="h-px bg-[#c3c8e8] dark:bg-[#1e1e38] my-2 mx-1" />

        {/* Ordered alphabetically by label (Agent, Architecture, BI, Bill,
            Estimate). Architecture/BI/Agent are still announcement-only —
            text/promo pages with a Soon badge, no widget. Bill and Estimate
            are both live and open — no `soon` flag. */}
        {renderLink('agent', 'Bring your Agent', '/bringyouragent', Bot, activeProductType === ('agent' as any), undefined, true, false, true)}
        {renderLink('architecture', 'Bring your Architecture', '/bringyourarchitecture', Layers, activeProductType === ('architecture' as any), undefined, true, false, true)}
        {renderLink('bi', 'Bring your BI', '/bringyourbi', PieChart, activeProductType === ('bi' as any), undefined, true, false, true)}
        {renderLink('bill', 'Bring your Bill', '/bringyourbill', Receipt, activeProductType === ('bill' as any), undefined, false, false, true)}
        {renderLink('estimate', 'Bring your Estimate', '/bringyourestimate', Calculator, activeProductType === ('estimate' as any), undefined, false, false, true)}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden h-[44px] sticky top-0 z-40 flex items-center px-3 border-b border-[#dde0f0] dark:border-[#1e1e38] bg-[#eef0fc] dark:bg-[#0c0c1e] shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          className="p-1.5 rounded text-[#737373] hover:text-black dark:hover:text-[#f7f8ff]"
        >
          <Menu size={20} />
        </button>
        <span className="ml-3 text-xs font-bold uppercase tracking-widest text-[#737373]">Compare Cloud Costs</span>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          w-64 border-r border-[#dde0f0] dark:border-[#1e1e38] flex flex-col overflow-y-auto bg-[#eef0fc] dark:bg-[#0c0c1e]
          fixed inset-y-0 left-0 z-50 max-w-[85vw] transform transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-[#dde0f0] dark:border-[#1e1e38]">
          <span className="text-sm font-bold text-[#1e1e38] dark:text-[#e5e7eb]">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 text-[#737373] hover:text-[#1e1e38] dark:hover:text-[#f7f8ff]"
          >
            <X size={20} />
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop persistent rail */}
      <aside
        className={`
          hidden lg:flex flex-col shrink-0 border-r border-[#dde0f0] dark:border-[#1e1e38] bg-[#eef0fc] dark:bg-[#0c0c1e]
          h-screen sticky top-0 overflow-hidden transition-all duration-200
          ${hydrated && collapsed ? 'w-[60px]' : 'w-56'}
        `}
      >
        {navContent}
      </aside>
    </>
  );
}
