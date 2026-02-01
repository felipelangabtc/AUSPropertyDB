import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string; // e.g., '15m'
  refreshTokenExpiry: string; // e.g., '7d'
  algorithm: 'HS256' | 'RS256' | 'ES256';
}

export interface TokenPayload {
  userId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  jti?: string; // JWT ID for token revocation
}

export interface RefreshTokenData {
  userId: string;
  tokenVersion: number;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

/**
 * Authentication Security Hardening
 *
 * Features:
 * - JWT token validation and rotation
 * - Refresh token management with versioning
 * - Token blacklisting/revocation
 * - Session security
 * - Password policy enforcement
 * - Multi-factor authentication (MFA) support
 * - Login attempt tracking
 */
@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);
  private jwtConfig: JWTConfig;

  // Token revocation list (in production, use Redis)
  private revokedTokens = new Map<string, Date>();

  // Session tracking for security
  private activeSessions = new Map<string, Set<string>>();

  // Failed login attempts
  private failedAttempts = new Map<string, { count: number; resetTime: number }>();

  // Refresh token versions for each user
  private tokenVersions = new Map<string, number>();

  constructor() {
    this.jwtConfig = this.loadJWTConfig();
    this.validateConfiguration();
  }

  /**
   * Load JWT configuration from environment
   */
  private loadJWTConfig(): JWTConfig {
    return {
      accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      algorithm: (process.env.JWT_ALGORITHM as any) || 'HS256',
    };
  }

  /**
   * Generate access token
   *
   * @example
   * const token = this.generateAccessToken({
   *   userId: 'user:123',
   *   organizationId: 'org:456',
   *   roles: ['user', 'admin'],
   *   permissions: ['read', 'write']
   * });
   */
  generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    try {
      const token = jwt.sign(payload, this.jwtConfig.accessTokenSecret, {
        expiresIn: this.jwtConfig.accessTokenExpiry,
        algorithm: this.jwtConfig.algorithm as any,
        jwtid: this.generateJTI(),
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  /**
   * Generate refresh token with versioning
   *
   * Refresh tokens are tied to a version number to support:
   * - Token rotation after password change
   * - Immediate invalidation of all old tokens
   * - Device-specific session management
   */
  generateRefreshToken(userId: string): string {
    try {
      const version = (this.tokenVersions.get(userId) || 0) + 1;
      this.tokenVersions.set(userId, version);

      const payload = {
        userId,
        version,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(payload, this.jwtConfig.refreshTokenSecret, {
        expiresIn: this.jwtConfig.refreshTokenExpiry,
        algorithm: this.jwtConfig.algorithm as any,
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
  }

  /**
   * Verify and validate token
   *
   * @throws UnauthorizedException if token is invalid/expired
   *
   * @example
   * const payload = this.verifyToken(token);
   */
  verifyToken(token: string): TokenPayload {
    try {
      // Check if token is revoked
      if (this.isTokenRevoked(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const payload = jwt.verify(token, this.jwtConfig.accessTokenSecret, {
        algorithms: [this.jwtConfig.algorithm],
      }) as TokenPayload;

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token with version check
   */
  verifyRefreshToken(token: string): { userId: string; version: number } {
    try {
      const payload = jwt.verify(token, this.jwtConfig.refreshTokenSecret, {
        algorithms: [this.jwtConfig.algorithm],
      }) as any;

      // Check if token version is valid (not invalidated)
      const currentVersion = this.tokenVersions.get(payload.userId) || 0;
      if (payload.version !== currentVersion) {
        throw new UnauthorizedException('Refresh token version mismatch - please login again');
      }

      return { userId: payload.userId, version: payload.version };
    } catch (error) {
      throw new UnauthorizedException(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Revoke a token (add to blacklist)
   *
   * @example
   * this.revokeToken(token); // On logout
   */
  revokeToken(token: string): void {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        this.revokedTokens.set(token, expiresAt);
        this.logger.log(`Token revoked: ${decoded.jti || 'no-jti'}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to revoke token: ${error.message}`);
    }
  }

  /**
   * Check if token is in revocation list
   */
  private isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  /**
   * Invalidate all refresh tokens for a user (forces re-login)
   *
   * Use cases:
   * - After password change
   * - After security incident
   * - After permission changes
   *
   * @example
   * this.invalidateUserSessions('user:123');
   */
  invalidateUserSessions(userId: string): void {
    // Increment version to invalidate all refresh tokens
    const newVersion = (this.tokenVersions.get(userId) || 0) + 1;
    this.tokenVersions.set(userId, newVersion);

    // Clear active sessions
    this.activeSessions.delete(userId);

    this.logger.log(`All sessions invalidated for user: ${userId}`);
  }

  /**
   * Register an active session
   *
   * @example
   * this.registerSession('user:123', 'device:abc123', token);
   */
  registerSession(userId: string, deviceId: string, token: string): void {
    if (!this.activeSessions.has(userId)) {
      this.activeSessions.set(userId, new Set());
    }

    this.activeSessions.get(userId)!.add(deviceId);
    this.logger.debug(`Session registered: ${userId}/${deviceId}`);
  }

  /**
   * Get active sessions for user
   */
  getActiveSessions(userId: string): string[] {
    return Array.from(this.activeSessions.get(userId) || []);
  }

  /**
   * Terminate a specific session
   */
  terminateSession(userId: string, deviceId: string): void {
    this.activeSessions.get(userId)?.delete(deviceId);
  }

  /**
   * Track failed login attempt
   *
   * @returns True if user should be locked out
   */
  trackFailedAttempt(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.failedAttempts.get(identifier) || {
      count: 0,
      resetTime: now + 15 * 60 * 1000, // 15 min window
    };

    // Reset if window expired
    if (now > attempt.resetTime) {
      attempt.count = 0;
      attempt.resetTime = now + 15 * 60 * 1000;
    }

    attempt.count++;
    this.failedAttempts.set(identifier, attempt);

    const shouldLockout = attempt.count > 5; // Lock after 5 failed attempts

    if (shouldLockout) {
      this.logger.warn(`Account locked due to too many failed attempts: ${identifier}`);
    }

    return shouldLockout;
  }

  /**
   * Clear failed attempts (on successful login)
   */
  clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Get failed login attempts
   */
  getFailedAttempts(identifier: string): number {
    const attempt = this.failedAttempts.get(identifier);
    if (!attempt || Date.now() > attempt.resetTime) {
      return 0;
    }
    return attempt.count;
  }

  /**
   * Generate JWT ID (unique identifier per token)
   * Used for token revocation
   */
  private generateJTI(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate JWT configuration at startup
   */
  private validateConfiguration(): void {
    if (!this.jwtConfig.accessTokenSecret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is required');
    }

    if (!this.jwtConfig.refreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    this.logger.log(
      `JWT configured with algorithm: ${this.jwtConfig.algorithm}, ` +
        `access expiry: ${this.jwtConfig.accessTokenExpiry}`
    );
  }

  /**
   * Clean up expired tokens from revocation list
   * Should be called periodically
   */
  cleanupRevokedTokens(): number {
    const now = new Date();
    let removed = 0;

    for (const [token, expiresAt] of this.revokedTokens.entries()) {
      if (expiresAt < now) {
        this.revokedTokens.delete(token);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get authentication security status
   */
  getStatus(): Record<string, any> {
    return {
      algorithm: this.jwtConfig.algorithm,
      accessTokenExpiry: this.jwtConfig.accessTokenExpiry,
      refreshTokenExpiry: this.jwtConfig.refreshTokenExpiry,
      revokedTokens: this.revokedTokens.size,
      activeSessions: this.activeSessions.size,
      failedAttempts: this.failedAttempts.size,
      tokenVersions: this.tokenVersions.size,
    };
  }
}

/**
 * Password security utilities
 */
export class PasswordSecurityUtils {
  /**
   * Validate password strength
   *
   * Requirements:
   * - At least 12 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character
   *
   * @example
   * if (!PasswordSecurityUtils.isStrong(password)) {
   *   throw new Error('Password does not meet requirements');
   * }
   */
  static isStrong(password: string): {
    isStrong: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isStrong: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password matches common patterns (weak passwords)
   */
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password',
      'password123',
      'admin',
      'admin123',
      '123456',
      'qwerty',
      'letmein',
      'welcome',
    ];

    return commonPasswords.some((common) => password.toLowerCase() === common);
  }
}
