/**
 * Simple in-memory rate limiter for AI endpoints.
 *
 * Uses a sliding window counter per user. Resets after the window expires.
 * For production at scale, replace with Redis-backed limiter.
 *
 * SECURITY: Prevents abuse of AI endpoints (both BYOK and hosted).
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

type RateLimitConfig = {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000, // 30 requests per minute
};

const HOSTED_CONFIG: RateLimitConfig = {
  maxRequests: 15,
  windowMs: 60 * 1000, // 15 requests per minute (stricter for hosted)
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check rate limit for a given user + action combination.
 * Returns whether the request is allowed and remaining quota.
 */
export function checkRateLimit(
  userId: string,
  action: string,
  isHosted: boolean = false
): RateLimitResult {
  cleanup();

  const config = isHosted ? HOSTED_CONFIG : DEFAULT_CONFIG;
  const key = `${userId}:${action}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}
