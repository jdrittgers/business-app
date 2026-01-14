import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Try to connect to Redis, but fall back to memory store if unavailable
// In development, skip Redis to avoid connection errors
let redisClient: Redis | null = null;

if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  try {
    const redisUrl = process.env.REDIS_URL;
    redisClient = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null // Don't retry, fail fast
    });

    redisClient.on('error', (err) => {
      console.warn('Redis connection error (rate limiting will use memory store):', err.message);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis connected for rate limiting');
    });
  } catch (error) {
    console.warn('Redis not available (rate limiting will use memory store)');
    redisClient = null;
  }
} else {
  console.log('⚠️  Redis disabled in development - using memory store for rate limiting');
}

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use Redis store if available, otherwise fall back to memory store
  ...(redisClient
    ? {
        store: new RedisStore({
          // @ts-expect-error - rate-limit-redis types may not be fully compatible
          sendCommand: (...args: string[]) => redisClient.call(...args),
          prefix: 'rl:api:'
        })
      }
    : {})
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  ...(redisClient
    ? {
        store: new RedisStore({
          // @ts-expect-error - rate-limit-redis types may not be fully compatible
          sendCommand: (...args: string[]) => redisClient.call(...args),
          prefix: 'rl:auth:'
        })
      }
    : {})
});

/**
 * Rate limiter for file uploads
 * 50 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient
    ? {
        store: new RedisStore({
          // @ts-expect-error - rate-limit-redis types may not be fully compatible
          sendCommand: (...args: string[]) => redisClient.call(...args),
          prefix: 'rl:upload:'
        })
      }
    : {})
});

/**
 * Rate limiter for subscription operations
 * 10 operations per hour per IP (creating subscriptions, etc.)
 */
export const subscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many subscription operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient
    ? {
        store: new RedisStore({
          // @ts-expect-error - rate-limit-redis types may not be fully compatible
          sendCommand: (...args: string[]) => redisClient.call(...args),
          prefix: 'rl:subscription:'
        })
      }
    : {})
});

/**
 * Export Redis client for other uses
 */
export { redisClient };
