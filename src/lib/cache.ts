// Simple in-process TTL cache for read-heavy, slowly-changing API responses.
//
// Pricing data is refreshed at most once a week (Sunday cron) or on an explicit
// admin fetch, but the dashboard hammers /api/pricing and /api/pricing/counts on
// every filter change and keystroke. Caching the DB result by its exact query
// string collapses that burst of identical reads into a single database round-trip.
//
// Notes:
// - This cache lives inside one server process. On a multi-instance deployment
//   each instance keeps its own copy; that is fine — each still shields the DB
//   from its own repeated reads. It is a performance optimization, not a source
//   of truth.
// - Entries expire by TTL and the map is size-capped, so it cannot grow without
//   bound even under an endless variety of filter combinations.

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 500;

export function getCached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setCached(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  // Evict when the cache gets large: first drop anything already expired, and if
  // that isn't enough, drop the oldest inserted entry (Map preserves insertion order).
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, entry] of store) {
      if (now > entry.expires) store.delete(k);
    }
    if (store.size >= MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) store.delete(oldestKey);
    }
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

// Wipe the whole cache. Call this after a pricing pipeline run so the next request
// reflects fresh prices immediately instead of waiting out the TTL.
export function clearCache(): void {
  store.clear();
}
