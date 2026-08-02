'use client';

import React, { useState, useEffect } from 'react';

const DO_REFERRAL_URL =
  'https://www.digitalocean.com/?refcode=23d2b384f3b1&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge';

const STORAGE_KEY = 'hideDoReferralModal';

export function DigitalOceanReferralModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    const timer = setTimeout(() => setIsOpen(true), 2000);
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

  const handleSignUp = () => {
    window.open(DO_REFERRAL_URL, '_blank', 'noopener,noreferrer');
    dismiss(doNotShowAgain);
  };

  const handleDismiss = () => dismiss(doNotShowAgain);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0a0a18] border border-[#dde0f0] dark:border-[#1e1e38] rounded-xl shadow-2xl p-6 max-w-md w-full relative">

        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-[#1a1a2e] dark:text-[#f7f8ff] leading-tight">
            Support Compare Cloud Costs for free
          </h2>
          <p className="text-[10px] text-[#737373] mt-0.5">DigitalOcean referral · no credit card required to explore</p>
        </div>

        <p className="text-[13px] text-[#404040] dark:text-[#a3a3a3] mb-3 leading-relaxed">
          You're already exploring cloud infrastructure — here's a way to get credit for it.
        </p>

        <p className="text-[13px] text-[#404040] dark:text-[#a3a3a3] mb-4 leading-relaxed">
          Sign up for a DigitalOcean free trial through our link and get{' '}
          <strong className="text-[#1a1a2e] dark:text-[#f7f8ff]">$200 in credit</strong>{' '}
          to try their platform. No cost to you.
        </p>

        {/* Highlight box */}
        <div
          className="rounded-lg p-3 mb-5 border"
          style={{ backgroundColor: '#0069FF12', borderColor: '#0069FF40' }}
        >
          <p className="text-[12px] leading-relaxed" style={{ color: '#004dbf' }}>
            <span className="dark:hidden">
              We receive <strong>$25 in hosting credit</strong> in return. Compare Cloud Costs runs on DigitalOcean, and every referral helps keep it online.
            </span>
            <span className="hidden dark:inline" style={{ color: '#60a5fa' }}>
              We receive <strong>$25 in hosting credit</strong> in return. Compare Cloud Costs runs on DigitalOcean, and every referral helps keep it online.
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSignUp}
            className="w-full py-2.5 px-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Get my $200 free credit →
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 bg-[#f5f5f5] dark:bg-[#262626] text-[#404040] dark:text-[#a3a3a3] font-medium rounded-lg hover:bg-[#e5e5e5] dark:hover:bg-[#404040] transition-colors"
          >
            Maybe another time
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-[#737373]">
          <input
            type="checkbox"
            id="doReferralNoShow"
            checked={doNotShowAgain}
            onChange={e => setDoNotShowAgain(e.target.checked)}
            className="rounded border-[#dde0f0] dark:border-[#1e1e38]"
          />
          <label htmlFor="doReferralNoShow" className="cursor-pointer select-none">
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
}
