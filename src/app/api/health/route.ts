import { NextRequest, NextResponse } from 'next/server';
import { getHealthSnapshot } from '@/lib/repositories/pricingRepository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());

    const snapshot = await getHealthSnapshot(query);

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      total_records: snapshot.total_records,
      by_provider: snapshot.by_provider,
      last_updated: snapshot.last_updated,
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
