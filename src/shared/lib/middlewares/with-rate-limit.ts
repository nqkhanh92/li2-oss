import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/infrastructure/cache/redis'
import { TooManyRequestsError } from '@/infrastructure/response/errors/domain.errors'
import { getSession } from '../auth/session'

export type RateLimitConfig = {
  /**
   * Maximum number of requests allowed within the window
   */
  maxRequests: number
  /**
   * Time window in seconds
   */
  windowSeconds: number
  /**
   * Optional custom key generator
   * Default: uses userId or IP address
   */
  keyGenerator?: (request: NextRequest, userId?: string) => string
  /**
   * Optional message to show when rate limit is exceeded
   */
  message?: string
}

type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Check rate limit for a given key
 */
async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - config.windowSeconds
  const redisKey = `rate_limit:${key}`

  // Use Redis sorted set to track requests with timestamps
  const multi = redis.multi()

  // Remove old requests outside the window
  multi.zremrangebyscore(redisKey, 0, windowStart)

  // Count requests in current window
  multi.zcard(redisKey)

  // Add current request
  multi.zadd(redisKey, now, `${now}-${Math.random()}`)

  // Set expiry on the key
  multi.expire(redisKey, config.windowSeconds)

  const results = await multi.exec()

  // Get count before adding current request
  const count = (results?.[1]?.[1] as number) || 0

  const remaining = Math.max(0, config.maxRequests - count - 1)
  const reset = now + config.windowSeconds

  if (count >= config.maxRequests) {
    // Remove the request we just added since we're over the limit
    await redis.zrem(redisKey, `${now}-${Math.random()}`)

    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset,
      retryAfter: config.windowSeconds,
    }
  }

  return {
    success: true,
    limit: config.maxRequests,
    remaining,
    reset,
  }
}

/**
 * Default key generator using userId or IP address
 */
function defaultKeyGenerator(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

/**
 * Rate limiting middleware wrapper
 *
 * @example Direct usage
 * ```typescript
 * export const POST = withRateLimit(
 *   { maxRequests: 5, windowSeconds: 60 }
 * )(async (request, { params }) => {
 *   return APIResponse.ok({ success: true })
 * })
 * ```
 *
 * @example With compose
 * ```typescript
 * export const POST = compose(
 *   withAuth,
 *   withRateLimit({ maxRequests: 10, windowSeconds: 60 })
 * )(async (request, { params, context }) => {
 *   return APIResponse.ok({})
 * })
 * ```
 */
export function withRateLimit<P extends Record<string, string> = Record<string, string>>(
  config: RateLimitConfig
) {
  return (
    handler: (request: NextRequest, context: { params: P }) => Promise<NextResponse> | NextResponse
  ) => {
    return async (request: NextRequest, context: { params: P }): Promise<NextResponse> => {
    try {
      // Get user session if available
      const session = await getSession()
      const userId = session?.id

      // Generate rate limit key
      const keyGenerator = config.keyGenerator || defaultKeyGenerator
      const rateLimitKey = keyGenerator(request, userId)

      // Get endpoint identifier from URL
      const pathname = new URL(request.url).pathname
      const method = request.method
      const endpointKey = `${method}:${pathname}:${rateLimitKey}`

      // Check rate limit
      const result = await checkRateLimit(endpointKey, config)

      // Add rate limit headers to response
      const addRateLimitHeaders = (response: NextResponse) => {
        response.headers.set('X-RateLimit-Limit', result.limit.toString())
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
        response.headers.set('X-RateLimit-Reset', result.reset.toString())
        if (result.retryAfter) {
          response.headers.set('Retry-After', result.retryAfter.toString())
        }
        return response
      }

      if (!result.success) {
        const errorMessage =
          config.message ||
          `Too many requests. Please try again in ${config.windowSeconds} seconds.`

        const errorResponse = new TooManyRequestsError(errorMessage).toResponse()
        return addRateLimitHeaders(errorResponse)
      }

      // Call the actual handler
      const response = await handler(request, context)

      // Add rate limit headers to successful response
      return addRateLimitHeaders(response)
    } catch (error) {
      // If rate limiting fails, let the request through but log the error
      console.error('Rate limit check failed:', error)
      return handler(request, context)
    }
    }
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /** Very strict: 5 requests per minute */
  STRICT: { maxRequests: 5, windowSeconds: 60 },

  /** Standard: 10 requests per minute */
  STANDARD: { maxRequests: 10, windowSeconds: 60 },

  /** Moderate: 30 requests per minute */
  MODERATE: { maxRequests: 30, windowSeconds: 60 },

  /** Generous: 100 requests per minute */
  GENEROUS: { maxRequests: 100, windowSeconds: 60 },

  /** Email sending: 5 per hour */
  EMAIL: { maxRequests: 5, windowSeconds: 3600 },

  /** Invitation: 10 per hour */
  INVITATION: { maxRequests: 10, windowSeconds: 3600 },

  /** Authentication: 5 per 15 minutes */
  AUTH: { maxRequests: 5, windowSeconds: 900 },

  /** File upload: 20 per hour */
  UPLOAD: { maxRequests: 20, windowSeconds: 3600 },
} as const
