'use client';

// Fire-and-forget POSTs (feature-usage increments, feature-feedback
// submissions) are deliberately non-blocking — a broken counter must never
// break the actual feature the user is waiting on. But "fire and forget"
// used to also mean "silently lost forever" if the request failed for any
// reason (a not-yet-migrated table, a network blip, a cold start) — exactly
// what happened 2026-07-31: the very first real phone test of Bring Your
// Estimate ran successfully, but its usage-counter increment vanished
// because `feature_usage_counts` didn't exist in the database yet, and there
// was no way to recover that lost event afterward.
//
// This queues a failed beacon in localStorage and retries it on the next
// page load (see flushQueuedBeacons, called once from providers.tsx) instead
// of dropping it. Still never blocks or surfaces an error to the user — the
// entire point is that this stays invisible either way.

const QUEUE_KEY = 'ccc-pending-beacons';
const MAX_QUEUE_SIZE = 20;

interface QueuedBeacon {
  url: string;
  body: unknown;
  queuedAt: number;
}

function readQueue(): QueuedBeacon[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedBeacon[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable/full — nothing more we can do; the event is lost,
    // same as before this module existed.
  }
}

function queueForRetry(url: string, body: unknown): void {
  const queue = readQueue();
  if (queue.length >= MAX_QUEUE_SIZE) queue.shift(); // drop the oldest, not the newest
  queue.push({ url, body, queuedAt: Date.now() });
  writeQueue(queue);
}

/**
 * POST body to url. On failure (network error or non-2xx), queues it for
 * retry on the next page load rather than losing it. Never throws.
 */
export function sendBeacon(url: string, body: unknown): void {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) queueForRetry(url, body);
    })
    .catch(() => queueForRetry(url, body));
}

/**
 * Retries every queued beacon once. Call at most once per page load (e.g.
 * from a top-level provider mounted on every page) — each failed retry
 * re-queues itself via sendBeacon's own failure path, so this is safe to
 * call repeatedly without duplicating successes.
 */
export function flushQueuedBeacons(): void {
  if (typeof window === 'undefined') return;
  const queue = readQueue();
  if (queue.length === 0) return;

  writeQueue([]); // clear optimistically; failures re-queue themselves
  for (const { url, body } of queue) {
    sendBeacon(url, body);
  }
}
