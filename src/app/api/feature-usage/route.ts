import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// Site-wide provider slugs a "Bring Your X" upload can originate from.
const VALID_PROVIDERS = ['aws', 'azure', 'gcp', 'oracle', 'digitalocean', 'alibaba'];

// "Bring Your X" features wired up to this counter so far. Add a value here
// (and a POST call from that feature's widget) to extend it to Bill/Architecture.
const VALID_FEATURES = ['estimate', 'bill'];

// GET /api/feature-usage?feature=estimate — per-provider counts for the
// "N evaluated" summary block on that feature's landing page.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const feature = searchParams.get('feature');
    if (!feature || !VALID_FEATURES.includes(feature)) {
      return NextResponse.json({ error: 'Unknown or missing feature' }, { status: 400 });
    }

    const rows = await sql`
      SELECT provider, count FROM feature_usage_counts WHERE feature = ${feature}
    `;
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.provider as string] = Number(row.count) || 0;

    return NextResponse.json({ feature, counts });
  } catch (err: any) {
    console.error('Feature usage GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch usage counts', details: err.message }, { status: 500 });
  }
}

// POST /api/feature-usage — increments one feature/provider pair by exactly 1.
// Called client-side after a successful run (e.g. EstimateUploadWidget after a
// successful analyze). No admin auth — this is a public preview counter, not
// billing data — but the fixed +1 and the allow-lists above mean a caller can
// at most inflate a count with repeated calls, never set it to an arbitrary value.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { feature, provider } = body || {};

    if (!feature || !VALID_FEATURES.includes(feature)) {
      return NextResponse.json({ error: 'Unknown or missing feature' }, { status: 400 });
    }
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Unknown or missing provider' }, { status: 400 });
    }

    const [row] = await sql`
      INSERT INTO feature_usage_counts (feature, provider, count, updated_at)
      VALUES (${feature}, ${provider}, 1, NOW())
      ON CONFLICT (feature, provider)
      DO UPDATE SET count = feature_usage_counts.count + 1, updated_at = NOW()
      RETURNING count
    `;

    return NextResponse.json({ feature, provider, count: Number(row.count) });
  } catch (err: any) {
    console.error('Feature usage POST error:', err);
    return NextResponse.json({ error: 'Failed to record usage', details: err.message }, { status: 500 });
  }
}
