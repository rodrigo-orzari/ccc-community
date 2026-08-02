'use client';

import React, { useState, useEffect } from 'react';

const INTUIT_PAYMENT_URL = 'https://connect.intuit.com/pay/comparecloudcosts/scs-v1-824a8961cf5a42edb4a9669eadc326d633c0e43cb25c449994ebf699ef3f754543e8bdeece91480e82e233bb2fd5f5c5-0';
const STORAGE_KEY = 'hideDonationModal';

interface DonationModalProps {
  showOn?: string; // Page identifier to show on (e.g., 'workloads')
}

export function DonationModal({ showOn = 'workloads' }: DonationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    // Check if dismissed permanently or in this session
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    // Show after 3 seconds on the target page
    const timer = setTimeout(() => setIsOpen(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = (permanent: boolean) => {
    if (permanent) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsOpen(false);
  };

  const handleDonate = () => {
    window.open(INTUIT_PAYMENT_URL, '_blank', 'noopener,noreferrer');
    dismiss(doNotShowAgain);
  };

  const handleDismiss = () => dismiss(doNotShowAgain);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0a0a18] border border-[#dde0f0] dark:border-[#1e1e38] rounded-xl shadow-2xl p-6 max-w-md w-full relative">

        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-[#1a1a2e] dark:text-[#f7f8ff] leading-tight">
            Buy me a coffee ☕
          </h2>
          <p className="text-[10px] text-[#737373] mt-0.5">Support the project · completely voluntary</p>
        </div>

        <p className="text-[13px] text-[#404040] dark:text-[#a3a3a3] mb-4 leading-relaxed">
          Compare Cloud Costs is free and open source. If it's saved you time, a small donation helps cover development and server costs.
        </p>

        {/* Highlight box */}
        <div
          className="rounded-lg p-3 mb-5 border"
          style={{ backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' }}
        >
          <p className="text-[12px] leading-relaxed" style={{ color: '#B45309' }}>
            <span className="dark:hidden">
              $3.99 covers a meaningful share of a day's server costs and goes straight back into keeping pricing data current.
            </span>
            <span className="hidden dark:inline" style={{ color: '#FCD34D' }}>
              $3.99 covers a meaningful share of a day's server costs and goes straight back into keeping pricing data current.
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleDonate}
            className="w-full py-2.5 px-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Buy me a coffee ☕
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 bg-[#f5f5f5] dark:bg-[#262626] text-[#404040] dark:text-[#a3a3a3] font-medium rounded-lg hover:bg-[#e5e5e5] dark:hover:bg-[#404040] transition-colors"
          >
            Maybe later
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-[#737373]">
          <input
            type="checkbox"
            id="donationNoShow"
            checked={doNotShowAgain}
            onChange={e => setDoNotShowAgain(e.target.checked)}
            className="rounded border-[#dde0f0] dark:border-[#1e1e38]"
          />
          <label htmlFor="donationNoShow" className="cursor-pointer select-none">
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
}
