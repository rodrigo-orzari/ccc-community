import { NextResponse } from 'next/server';
import { getDynamicFilters } from '@/lib/repositories/pricingRepository';

export const dynamic = 'force-dynamic';
// Cache for 10 minutes to balance freshness with performance
export const revalidate = 600;

export async function GET() {
  try {
    const result = await getDynamicFilters();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API Error:', err);
    const details = process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message;
    return NextResponse.json({ error: 'Failed to fetch dynamic filters', details }, { status: 500 });
  }
}
