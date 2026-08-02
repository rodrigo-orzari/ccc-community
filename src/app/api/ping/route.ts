import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'pong',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
