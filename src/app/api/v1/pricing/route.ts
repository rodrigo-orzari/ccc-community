import { NextRequest, NextResponse } from 'next/server';
import { getPricingRecords } from '@/lib/repositories/pricingRepository';
import { authenticateApiKey } from '@/lib/apiKeyAuth';

export const dynamic = 'force-dynamic';

// GET /api/v1/pricing — the versioned, key-authenticated public contract for
// the pricing dataset. This is the third-party integration surface: same
// filters and response shape as the internal /api/pricing the dashboard
// calls, but requires an X-API-Key header and is subject to the key's tier
// rate limit instead of the dashboard's own caching/plumbing. See
// docs/page.tsx's "Public API" section for filter parameters and examples,
// and src/lib/apiKeyAuth.ts for how keys are issued and rate-limited.
//
// Internal /api/pricing stays as-is and unauthenticated — this route is
// additive, not a replacement, so the dashboard's own requests are never
// subject to a key or a tier limit.
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    const headers = auth.rateLimit
      ? { 'X-RateLimit-Limit': String(auth.rateLimit.limit), 'X-RateLimit-Remaining': String(auth.rateLimit.remaining) }
      : undefined;
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401, headers });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    const records = await getPricingRecords(query);

    return NextResponse.json(
      { data: records, count: records.length },
      {
        headers: {
          'X-RateLimit-Limit': String(auth.rateLimit!.limit),
          'X-RateLimit-Remaining': String(auth.rateLimit!.remaining),
        },
      }
    );
  } catch (err: any) {
    console.error('API v1 pricing error:', err);
    return NextResponse.json({ error: 'Failed to fetch pricing data', details: err.message }, { status: 500 });
  }
}
