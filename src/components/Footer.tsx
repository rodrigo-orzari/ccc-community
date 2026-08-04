'use client';

import React from 'react';
import Link from 'next/link';

// Community-edition override — no sponsorship/premium concepts apply to a
// self-hosted instance, and Blog/Docs/Sign-in aren't included in this
// edition's routes. See scripts/export-community.mjs for how this file gets
// applied over the copy from ccc's own Footer.tsx.
export default function Footer() {
  return (
    <footer className="border-t border-[#e5e5e5] dark:border-[#262626] bg-[#fcfcfc] dark:bg-[#050505] py-3 px-4 shrink-0 z-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] font-medium text-[#737373] dark:text-[#a3a3a3]">
          <Link href="/about" className="hover:text-black dark:hover:text-white transition-colors">
            About
          </Link>
          <a
            href="https://github.com/rodrigo-orzari/ccc-community"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black dark:hover:text-white transition-colors"
          >
            GitHub
          </a>
          <Link href="/methodology" className="hover:text-black dark:hover:text-white transition-colors">
            Methodology
          </Link>
          <Link href="/privacy" className="hover:text-black dark:hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/status" className="hover:text-black dark:hover:text-white transition-colors">
            Status
          </Link>
          <Link href="/terms" className="hover:text-black dark:hover:text-white transition-colors">
            Terms
          </Link>
        </div>
        <div className="text-[9px] text-[#a3a3a3] dark:text-[#737373]">
          Compare Cloud Costs — Community Edition. Licensed under AGPL-3.0.
        </div>
      </div>
    </footer>
  );
}
