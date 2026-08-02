import { NextRequest, NextResponse } from 'next/server';
import { getPricingCounts } from '@/lib/repositories/pricingRepository';
import { getCached, setCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    const cacheKey = 'counts:' + searchParams.toString();
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = await getPricingCounts(query);

    setCached(cacheKey, result);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Counts API error:', err);
    return NextResponse.json({ error: 'Failed to fetch counts', details: err.message }, { status: 500 });
  }
}
