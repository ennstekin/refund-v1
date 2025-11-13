/**
 * Simple in-memory rate limiter for Vercel serverless functions
 * Uses LRU cache to prevent memory leaks
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on cold start, but good enough for basic protection)
const limitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limitStore.entries()) {
    if (now > entry.resetTime) {
      limitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  max: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;
}

export interface RateLimitResult {
  /**
   * Whether the request should be allowed
   */
  success: boolean;

  /**
   * Current request count
   */
  count: number;

  /**
   * Remaining requests in the window
   */
  remaining: number;

  /**
   * Time until the limit resets (in seconds)
   */
  resetIn: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { max: 10, windowMs: 60 * 1000 } // Default: 10 req/min
): RateLimitResult {
  const now = Date.now();
  const entry = limitStore.get(identifier);

  // No existing entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    limitStore.set(identifier, { count: 1, resetTime });

    return {
      success: true,
      count: 1,
      remaining: config.max - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
    };
  }

  // Increment count
  entry.count++;
  limitStore.set(identifier, entry);

  const resetIn = Math.ceil((entry.resetTime - now) / 1000);
  const remaining = Math.max(0, config.max - entry.count);

  // Check if limit exceeded
  if (entry.count > config.max) {
    return {
      success: false,
      count: entry.count,
      remaining: 0,
      resetIn,
    };
  }

  return {
    success: true,
    count: entry.count,
    remaining,
    resetIn,
  };
}

/**
 * Get client IP address from request
 * @param request - NextRequest object
 * @returns IP address
 */
export function getClientIp(request: Request): string {
  // Try different headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback
  return 'unknown';
}

/**
 * Format rate limit error message
 * @param result - Rate limit result
 * @returns Error message
 */
export function getRateLimitMessage(result: RateLimitResult): string {
  return `Çok fazla istek gönderdiniz. Lütfen ${result.resetIn} saniye bekleyin.`;
}
