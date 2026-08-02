import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// Every surface with a FeedbackToast wired up (see src/components/FeedbackToast.tsx).
// 'estimate'/'bill' also feed /api/feature-usage's usage counters; the rest
// are feedback-only surfaces with no usage counter.
const VALID_FEATURES = [
  'estimate', 'bill', 'product-filters', 'workloads-priorities',
  'datacenters-filters', 'compliance-filters',
];
// `context` on non-"Bring Your X" surfaces isn't always a provider slug (e.g.
// product-filters passes the active product type) — validated as a short
// alphanumeric-plus-dash token rather than against the provider allow-list.
const CONTEXT_PATTERN = /^[a-z0-9-]{1,30}$/i;

// POST /api/feature-feedback — records one outcome of the post-analysis
// feedback toast: either a star rating (+ optional comment) or a dismissal.
// No admin auth: this is anonymous, low-stakes preview feedback, not billing
// data. Rating is server-validated to 1-5 and comment is length-capped so a
// malformed client can't corrupt the table either way.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { feature, provider, rating, comment, dismissed } = body || {};

    if (!feature || !VALID_FEATURES.includes(feature)) {
      return NextResponse.json({ error: 'Unknown or missing feature' }, { status: 400 });
    }
    const normalizedProvider = typeof provider === 'string' && CONTEXT_PATTERN.test(provider) ? provider : null;

    const isDismissed = dismissed === true;

    let normalizedRating: number | null = null;
    if (!isDismissed) {
      normalizedRating = Number(rating);
      if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        return NextResponse.json({ error: 'rating must be an integer 1-5 unless dismissed=true' }, { status: 400 });
      }
    }

    const normalizedComment = typeof comment === 'string' ? comment.slice(0, 2000) : null;

    await sql`
      INSERT INTO feature_feedback (feature, provider, rating, comment, dismissed)
      VALUES (${feature}, ${normalizedProvider}, ${normalizedRating}, ${normalizedComment}, ${isDismissed})
    `;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Feature feedback POST error:', err);
    return NextResponse.json({ error: 'Failed to record feedback', details: err.message }, { status: 500 });
  }
}
