import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom rate limiting guard with per-user limits
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID if authenticated, otherwise use IP address
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    return super.getTracker(req);
  }

  protected getKey(
    throttlerLimit: number,
    throttlerTTL: number,
    tracker: string,
    requestResponseContextHolder: string
  ): string {
    // Create key with more specificity
    return `${tracker}:${requestResponseContextHolder}:${throttlerLimit}:${throttlerTTL}`;
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Public endpoints - more restrictive
  public: { ttl: 60 * 1000, limit: 30 }, // 30 requests per minute

  // Authenticated endpoints - moderate
  authenticated: { ttl: 60 * 1000, limit: 100 }, // 100 requests per minute

  // Admin endpoints - less restrictive
  admin: { ttl: 60 * 1000, limit: 500 }, // 500 requests per minute

  // Search endpoints - specifically tuned
  search: { ttl: 60 * 1000, limit: 20 }, // 20 searches per minute

  // Connector endpoints - moderate
  connector: { ttl: 60 * 1000, limit: 50 }, // 50 requests per minute

  // ML endpoints
  ml: { ttl: 60 * 1000, limit: 100 }, // 100 predictions per minute

  // Auth endpoints - more restrictive
  auth: { ttl: 60 * 1000, limit: 5 }, // 5 attempts per minute
};

export default RateLimitGuard;
