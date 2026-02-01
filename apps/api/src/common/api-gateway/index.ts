export { KongGatewayService, KongService, KongRoute, KongPlugin, RateLimitConfig } from './kong.gateway';
export { TraefikGatewayService, TraefikService, TraefikRouter, TraefikMiddleware, AdvancedRateLimiter } from './traefik.gateway';
export { AdvancedRateLimiterService, RateLimitRule, RateLimitContext, RateLimitStatus } from './advanced-rate-limiter';
export { ApiGatewayController } from './api-gateway.controller';
export { ApiGatewayModule } from './api-gateway.module';

// Default Gateway Strategies
export const GATEWAY_STRATEGIES = {
  KONG: 'kong',
  TRAEFIK: 'traefik',
  HYBRID: 'hybrid', // Kong for API management, Traefik for routing
} as const;

// Rate Limiting Algorithms
export const RATE_LIMITING_STRATEGIES = {
  FIXED_WINDOW: 'fixed-window',
  SLIDING_WINDOW: 'sliding-window',
  TOKEN_BUCKET: 'token-bucket',
  LEAKY_BUCKET: 'leaky-bucket',
} as const;

// Default Rate Limit Configurations
export const DEFAULT_RATE_LIMITS = {
  API_GLOBAL: {
    requests: 10000,
    window: 60, // per minute
  },
  AUTH_LOGIN: {
    requests: 5,
    window: 60, // 5 attempts per minute
  },
  SEARCH: {
    requests: 100,
    window: 60,
  },
  EXPORT: {
    requests: 10,
    window: 3600, // per hour
  },
  PUBLIC_API: {
    requests: 1000,
    window: 60,
  },
  ADMIN_API: {
    requests: 50000,
    window: 60,
  },
} as const;

// Kong Configuration Defaults
export const KONG_DEFAULTS = {
  ADMIN_PORT: 8001,
  PROXY_PORT: 8000,
  ADMIN_URL: 'http://localhost:8001',
  PROXY_URL: 'http://localhost:8000',
  CONNECTION_TIMEOUT: 60000,
  SEND_TIMEOUT: 60000,
  READ_TIMEOUT: 60000,
  RETRIES: 3,
} as const;

// Traefik Configuration Defaults
export const TRAEFIK_DEFAULTS = {
  API_PORT: 8080,
  PROXY_PORT_HTTP: 80,
  PROXY_PORT_HTTPS: 443,
  API_URL: 'http://localhost:8080',
  CONFIG_PATH: '/etc/traefik',
  DASHBOARD_ENABLED: true,
  LOG_LEVEL: 'INFO',
} as const;

// Middleware Priority
export const MIDDLEWARE_PRIORITY = {
  SECURITY: 100,
  AUTHENTICATION: 90,
  RATE_LIMITING: 80,
  LOGGING: 70,
  COMPRESSION: 60,
  CACHING: 50,
  ROUTING: 40,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
