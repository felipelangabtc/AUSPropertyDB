/**
 * Security Module Exports
 *
 * Centralized export of all security services and utilities
 */

export {
  EncryptionService,
  EncryptedData,
  FieldEncryptionSchema,
  EncryptionUtils,
} from './encryption.service';

export { TLSConfigService, TLSConfig, CertificateInfo, CertificateUtils } from './tls.config';

export { RLSPolicyService, RLSPolicy, TenantContext, TenantContextHolder } from './rls.policy';

export { InputValidationMiddleware, SanitizationUtils } from './validation.middleware';

export {
  RateLimiterService,
  RateLimitConfig,
  RateLimitStrategy,
  RateLimitData,
  RateLimitInterceptor,
} from './rate-limiter';

export { SecretsManagerService, SecretConfig, Secret, SecretsUtils } from './secrets-manager';

export {
  AuthSecurityService,
  JWTConfig,
  TokenPayload,
  PasswordSecurityUtils,
} from './auth-security';

/**
 * Security Services Registry
 *
 * Provides convenience method to get all security services
 */
export const SECURITY_SERVICES = [
  EncryptionService,
  TLSConfigService,
  RLSPolicyService,
  RateLimiterService,
  SecretsManagerService,
  AuthSecurityService,
];

/**
 * Security Middleware & Interceptors
 */
export const SECURITY_MIDDLEWARE = [InputValidationMiddleware];

export const SECURITY_INTERCEPTORS = [RateLimitInterceptor];
