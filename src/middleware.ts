import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory store for rate limiting.
// Note: In Next.js Edge Runtime, this state persists per V8 isolate.
// It is not globally synchronized, but it effectively limits abuse per edge instance.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per IP

function getRateLimitStatus(ip: string) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + WINDOW_SIZE_MS });
    return { isRateLimited: false, limit: MAX_REQUESTS_PER_WINDOW, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetTime: now + WINDOW_SIZE_MS };
  }

  if (now > record.resetTime) {
    // Window expired, reset
    record.count = 1;
    record.resetTime = now + WINDOW_SIZE_MS;
    return { isRateLimited: false, limit: MAX_REQUESTS_PER_WINDOW, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetTime: record.resetTime };
  }

  record.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count);
  return { isRateLimited: record.count > MAX_REQUESTS_PER_WINDOW, limit: MAX_REQUESTS_PER_WINDOW, remaining, resetTime: record.resetTime };
}

// Optional: clean up the map periodically to prevent memory leaks over long-lived isolates
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, WINDOW_SIZE_MS * 5);

// Constant-time comparison, same approach as requireAdminAuth in api-utils.ts —
// a plain `===` here would leak timing information about how many leading
// characters of the admin token guess were correct.
function isValidAdminToken(candidate: string): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// NOTE: this file must be named `middleware.ts` (not `proxy.ts`, as it
// previously was) and export a function named `middleware` — Next.js only
// wires up request middleware under that exact file name + export name. The
// previous `proxy.ts` / `export function proxy` was silently never invoked,
// meaning /api/pricing and /api/status had zero rate limiting in production
// despite this code existing. See CHANGELOG.md (2026-08-01) for the fix.
export function middleware(req: NextRequest) {
  // Apply rate limiting only to API routes that are public and heavy
  if (req.nextUrl.pathname.startsWith('/api/pricing') || req.nextUrl.pathname.startsWith('/api/status')) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    // Skip rate limiting for internal/admin requests if they have the admin token
    // (We assume admin token implies trusted traffic)
    const adminToken = req.headers.get('x-admin-token');
    if (adminToken && isValidAdminToken(adminToken)) {
      return NextResponse.next();
    }

    const { isRateLimited, limit, remaining, resetTime } = getRateLimitStatus(ip);

    if (isRateLimited) {
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', limit.toString());
    res.headers.set('X-RateLimit-Remaining', remaining.toString());
    res.headers.set('X-RateLimit-Reset', resetTime.toString());
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
