'use client';

// Shared post-action feedback toast — a small, non-blocking star rating +
// comment ask that slides in a few seconds after the user does something
// worth asking about (an estimate cross-match completes, filters get
// applied, workload priorities get adjusted, ...). One instance of this
// component per surface; each surface picks its own `feature` key.
//
// Fires at most once per browser per `feature`: once shown, a rating,
// comment, or dismissal is recorded via POST /api/feature-feedback and a
// localStorage flag suppresses it permanently for that feature on this
// browser (see feature_feedback in schema.sql for what gets stored, and
// where dismissed=true rows let us count how many people declined).

import React, { useState, useEffect, useRef } from 'react';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { sendBeacon } from '@/lib/reliableBeacon';

interface FeedbackToastProps {
  /** Storage/API key for this surface — e.g. 'estimate', 'compute-filters', 'workloads-priorities'. */
  feature: string;
  /** Parent flips this true once the triggering action has happened; the countdown starts then. */
  active: boolean;
  /** Optional context tag stored alongside the feedback row (e.g. active product type or provider). */
  context?: string;
  delaySeconds?: number;
}

// Copy is intentionally fixed, not a prop — this toast now shows up across
// unrelated surfaces (Bring Your Estimate, product filters, workload
// priorities, datacenters/compliance filters, ...), and a single shared,
// generic message is what makes it read as one consistent site-wide survey
// instead of a different mini-questionnaire on every page.
const QUESTION = 'We want to hear from you! How satisfied are you with the results by Compare Cloud Costs?';
const SUBTEXT = 'Your feedback helps us keep improving.';

export function FeedbackToast({
  feature,
  active,
  context,
  delaySeconds = 5,
}: FeedbackToastProps) {
  const storageKey = `ccc-feedback-${feature}`;
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against re-arming the timer on every re-render while `active` stays true.
  const armedRef = useRef(false);

  useEffect(() => {
    if (!active || armedRef.current) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(storageKey)) return;

    armedRef.current = true;
    timerRef.current = setTimeout(() => setShow(true), delaySeconds * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const record = (payload: { rating?: number; comment?: string; dismissed: boolean }) => {
    window.localStorage.setItem(storageKey, '1');
    sendBeacon('/api/feature-feedback', { feature, provider: context, ...payload });
  };

  const handleDismiss = () => {
    record({ dismissed: true });
    setShow(false);
  };

  const handleSubmit = () => {
    if (rating < 1) return;
    record({ rating, comment: comment.trim() || undefined, dismissed: false });
    setSubmitted(true);
    setTimeout(() => setShow(false), 2000);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[320px] bg-white dark:bg-[#111] border border-[var(--border)] rounded-xl shadow-lg p-5 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss feedback request"
        className="absolute top-3 right-3 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
      >
        <X size={16} />
      </button>

      {submitted ? (
        <div className="text-center py-3">
          <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-[var(--text)]">Thanks for the feedback!</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-bold text-[var(--text)] mb-1 pr-5">{QUESTION}</p>
          <p className="text-[11px] text-[var(--muted)] mb-3">{SUBTEXT}</p>

          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className="cursor-pointer"
              >
                <Star
                  size={22}
                  className={n <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-[var(--border)]'}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything about accuracy or your experience? (optional)"
            rows={3}
            maxLength={2000}
            className="w-full p-2 text-xs rounded-lg border border-[var(--border)] bg-[#e8eaf8] dark:bg-[#10102a] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-none mb-3"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={rating < 1}
              className="flex-1 px-3 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Submit
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              No thanks
            </button>
          </div>
        </>
      )}
    </div>
  );
}
