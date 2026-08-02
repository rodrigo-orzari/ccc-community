import { NextRequest, NextResponse } from 'next/server';
import { getFacetCounts } from '@/lib/repositories/pricingRepository';
import { getCached, setCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// Per-option result counts for the filter sidebar ("AWS 1,840"). See
// getFacetCounts in @/lib/repositories/pricingRepository for the faceted-search
// semantics and the FACETS list (add a new facet there, not here).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    const cacheKey = 'facets:' + searchParams.toString();
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = await getFacetCounts(query);

    setCached(cacheKey, result);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Facets API error:', err);
    return NextResponse.json({ error: 'Failed to fetch facet counts', details: err.message }, { status: 500 });
  }
}
