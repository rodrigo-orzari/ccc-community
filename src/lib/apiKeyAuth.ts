// Auth + rate limiting for the versioned public API (/api/v1/*).
//
// This is a deliberately lightweight, self-hosted alternative to a full API
// gateway product: hashed keys in Postgres (never store/log the plaintext),
// tier-based hourly limits enforced with an in-process counter. Same
// single-process caveat as src/lib/cache.ts — on a multi-instance deployment
// each instance enforces its own window, which undercounts total traffic
// slightly but never lets a caller exceed N requests against any one
// instance. Good enough for a preview-stage public API; revisit with a
// shared store (Redis) only once real multi-instance traffic makes that
// undercount matter.

import crypto from 'crypto';
import sql from './db';

export type ApiTier = 'free' | 'partner';

export const TIER_LIMITS: Record<ApiTier, { requestsPerHour: number; label: string }> = {
  free: { requestsPerHour: 100, label: 'Free' },
  partner: { requestsPerHour: 2000, label: 'Partner' },
};

interface ApiKeyRecord {
  id: number;
  tier: ApiTier;
  label: string;
}

/** SHA-256 hex digest — the only form of the key that ever touches the database. */
export function hashApiKey(plaintextKey: string): string {
  return crypto.createHash('sha256').update(plaintextKey).digest('hex');
}

/** Generates a new plaintext key: `ccc_live_` + 32 random hex chars. */
export function generateApiKey(): { plaintextKey: string; prefix: string } {
  const random = crypto.randomBytes(16).toString('hex');
  const plaintextKey = `ccc_live_${random}`;
  return { plaintextKey, prefix: plaintextKey.slice(0, 12) };
}

// Per-process request counters, windowed to the current UTC hour. Reset
// happens implicitly: a key's counter for an hour it hasn't been seen in yet
// starts at 0 because the map key includes the hour bucket.
const rateLimitStore = new Map<string, number>();

function currentHourBucket(): string {
  return new Date().toISOString().slice(0, 13); // e.g. "2026-07-30T14"
}

/** Returns { allowed, remaining, limit } without mutating the counter. */
function peekRateLimit(keyId: number, tier: ApiTier) {
  const limit = TIER_LIMITS[tier].requestsPerHour;
  const bucketKey = `${keyId}:${currentHourBucket()}`;
  const used = rateLimitStore.get(bucketKey) ?? 0;
  return { allowed: used < limit, remaining: Math.max(0, limit - used), limit, bucketKey };
}

/** Increments the counter for this key's current hour bucket. */
function consumeRateLimit(bucketKey: string) {
  rateLimitStore.set(bucketKey, (rateLimitStore.get(bucketKey) ?? 0) + 1);
  // Opportunistic cleanup so the map doesn't grow forever across many keys/hours.
  if (rateLimitStore.size > 5000) {
    const cutoff = currentHourBucket();
    for (const k of rateLimitStore.keys()) {
      if (!k.endsWith(cutoff)) rateLimitStore.delete(k);
    }
  }
}

export interface ApiKeyAuthResult {
  ok: boolean;
  status?: number;
  error?: string;
  key?: ApiKeyRecord;
  rateLimit?: { limit: number; remaining: number };
}

/**
 * Validates the X-API-Key header against api_keys, enforces the key's tier
 * rate limit, and (on success) records usage. Does not throw — always
 * returns a result the route can branch on.
 */
export async function authenticateApiKey(req: Request): Promise<ApiKeyAuthResult> {
  const plaintextKey = req.headers.get('x-api-key');
  if (!plaintextKey) {
    return { ok: false, status: 401, error: 'Missing X-API-Key header. Request a key: hello@comparecloudcosts.com' };
  }

  const keyHash = hashApiKey(plaintextKey);
  const [row] = await sql`
    SELECT id, tier, label FROM api_keys
    WHERE key_hash = ${keyHash} AND revoked_at IS NULL
  `;
  if (!row) {
    return { ok: false, status: 401, error: 'Invalid or revoked API key.' };
  }

  const tier = (row.tier as ApiTier) in TIER_LIMITS ? (row.tier as ApiTier) : 'free';
  const { allowed, remaining, limit, bucketKey } = peekRateLimit(row.id, tier);
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: `Rate limit exceeded (${limit} requests/hour on the ${TIER_LIMITS[tier].label} tier). Try again next hour, or contact hello@comparecloudcosts.com about the Partner tier.`,
      rateLimit: { limit, remaining: 0 },
    };
  }

  consumeRateLimit(bucketKey);

  // Fire-and-forget usage bookkeeping — a failed UPDATE shouldn't fail the request.
  sql`
    UPDATE api_keys SET request_count = request_count + 1, last_used_at = NOW()
    WHERE id = ${row.id}
  `.catch((err: any) => console.error('api_keys usage update failed:', err));

  return {
    ok: true,
    key: { id: row.id, tier, label: row.label },
    rateLimit: { limit, remaining: remaining - 1 },
  };
}
