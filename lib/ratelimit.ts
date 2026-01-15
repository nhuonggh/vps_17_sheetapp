import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
// Make sure to set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// Check if Redis credentials are valid (not placeholders or empty)
const hasValidRedisUrl = redisUrl && !redisUrl.includes('your_redis') && redisUrl.startsWith('https://');
const hasValidRedisToken = redisToken && !redisToken.includes('your_redis') && redisToken.length > 20;

let redis: Redis | null = null;

if (hasValidRedisUrl && hasValidRedisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log('✅ Upstash Redis connected for rate limiting');
  } catch (error) {
    console.error('⚠️ Failed to initialize Redis:', error);
    redis = null;
  }
} else {
  console.warn('⚠️ Upstash Redis credentials not configured or invalid.');
  console.warn('   Rate limiting will be DISABLED in development mode.');
  console.warn('   To enable: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local');
}

/**
 * Create a mock rate limiter that always allows requests
 * Used when Redis is not configured (development mode)
 */
function createMockRateLimit(): Ratelimit {
  return {
    limit: async () => ({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    }),
  } as any;
}

/**
 * Strict rate limit for authentication endpoints
 * Prevents brute force attacks on login/register
 * Limit: 5 attempts per 15 minutes per IP
 */
export const authRateLimit = redis
  ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  })
  : createMockRateLimit();

/**
 * Moderate rate limit for general API queries
 * Prevents API flooding and DDoS
 * Limit: 100 requests per minute per IP
 */
export const apiRateLimit = redis
  ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  })
  : createMockRateLimit();

/**
 * Strict rate limit for form submissions
 * Prevents spam in contact/booking forms
 * Limit: 3 submissions per hour per IP
 */
export const formRateLimit = redis
  ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: 'ratelimit:form',
  })
  : createMockRateLimit();

/**
 * Helper function to get client IP from request
 */
export function getClientIp(request: Request): string {
  // Try to get real IP from headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to localhost for development
  return '127.0.0.1';
}
