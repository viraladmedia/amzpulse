import { HttpError } from './http.mjs';

// In-memory fixed-window limiter keyed by route name + client IP. This protects a single
// server instance from being hammered directly (bypassing the client's plan-quota UI) and
// running up billed Gemini/PA-API/Keepa/etc. usage. It is NOT a distributed limiter: on a
// multi-instance serverless deployment each instance keeps its own counts, so this caps
// per-instance abuse rather than enforcing one global ceiling. For a hard global limit,
// back this with Redis/Upstash/Vercel KV instead.
const buckets = new Map();

let lastPrune = 0;
const PRUNE_INTERVAL_MS = 60_000;

const pruneExpired = (now) => {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
};

const getClientIp = (req) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

/**
 * Throws HttpError(429) if the caller has exceeded `max` requests within `windowMs`
 * for the given route `name`. Call this before doing any expensive/billed work.
 */
export const checkRateLimit = (req, { name, windowMs, max }) => {
  const now = Date.now();
  if (now - lastPrune > PRUNE_INTERVAL_MS) {
    pruneExpired(now);
    lastPrune = now;
  }

  const key = `${name}:${getClientIp(req)}`;
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
  if (entry.count > max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    throw new HttpError(429, `Too many requests. Try again in ${retryAfterSeconds}s.`, { retryAfterSeconds });
  }
};

// Shared limits so dev middleware and Vercel functions enforce the same policy.
export const RATE_LIMITS = {
  analysis: { name: 'analysis', windowMs: 60_000, max: 10 }, // Gemini call per request
  batch: { name: 'batch', windowMs: 60_000, max: 5 }, // up to 100 ASINs per call
  product: { name: 'product', windowMs: 60_000, max: 30 }, // single ASIN lookup
  featured: { name: 'featured', windowMs: 60_000, max: 20 } // dashboard preload
};
