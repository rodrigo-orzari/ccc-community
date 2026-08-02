'use client';

import React, { useState } from 'react';

interface CopyHeadingProps {
  id: string;
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  // Applied to the heading tag itself so each page keeps its own typography —
  // this component only adds the flex layout + copy-link button, it doesn't
  // dictate font size/weight/margin.
  className?: string;
}

// Section heading with a click-to-copy deep link to that section. Copies the
// full absolute URL (origin + pathname + #id) to the clipboard and shows a
// "Copied" confirmation, falling back gracefully if the Clipboard API is
// unavailable (still updates the URL hash so the link is at least shareable
// via the address bar).
export function CopyHeading({ id, children, as: Tag = 'h2', className = '' }: CopyHeadingProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    const done = () => {
      setCopied(true);
      window.history.replaceState(null, '', `#${id}`);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      done();
    }
  };

  return (
    <Tag id={id} className={`group flex items-center gap-2 ${className}`}>
      {children}
      <button
        type="button"
        onClick={copyLink}
        aria-label={`Copy link to the ${typeof children === 'string' ? children : 'section'} section`}
        title="Copy link to this section"
        className={`shrink-0 text-[0.7rem] font-semibold rounded px-1.5 py-0.5 whitespace-nowrap transition-opacity duration-150 ${
          copied
            ? 'opacity-100 text-green-600 dark:text-green-400'
            : 'opacity-0 group-hover:opacity-75 hover:!opacity-100 text-[#6b7280] dark:text-[#a1a1aa] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#171717] dark:hover:text-[#e5e7eb]'
        }`}
      >
        {copied ? '✓ Copied' : '🔗 Copy link'}
      </button>
    </Tag>
  );
}
