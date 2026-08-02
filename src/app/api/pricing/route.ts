import { NextRequest, NextResponse } from 'next/server';
import { getPricingRecords } from '@/lib/repositories/pricingRepository';
import { getCached, setCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    // Serve identical filter requests from the in-process cache. Prices change at
    // most weekly, so a short TTL is safe and spares the DB from repeated identical reads.
    const cacheKey = 'pricing:' + searchParams.toString();
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    const records = await getPricingRecords(query);

    setCached(cacheKey, records);
    return NextResponse.json(records);
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch pricing data', details: err.message }, { status: 500 });
  }
}
