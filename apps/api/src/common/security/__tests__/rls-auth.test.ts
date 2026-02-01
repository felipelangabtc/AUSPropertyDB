import { describe, it, expect, beforeEach } from 'vitest';
import { RLSPolicyService } from '../rls.policy';
import { AuthSecurityService, PasswordSecurityUtils } from '../auth-security';

describe('RLSPolicyService', () => {
  let service: RLSPolicyService;

  beforeEach(() => {
    service = new RLSPolicyService();
  });

  describe('RLS policy generation', () => {
    it('should generate enable RLS SQL', () => {
      const sql = service.generateEnableRLSSQL('properties');
      expect(sql).toContain('ALTER TABLE properties');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    });

    it('should generate create policy SQL', () => {
      const policies = service.getAllPolicies();
      expect(policies.length).toBeGreaterThan(0);

      const policy = policies[0];
      const sql = service.generateCreatePolicySQL(policy);

      expect(sql).toContain('CREATE POLICY');
      expect(sql).toContain(policy.name);
      expect(sql).toContain(policy.table);
    });

    it('should generate full RLS setup SQL', () => {
      const commands = service.generateAllRLSSetupSQL();

      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]).toContain('ENABLE ROW LEVEL SECURITY');
    });

    it('should generate migration SQL', () => {
      const migration = service.generateMigrationSQL();

      expect(migration).toContain('Enable Row-Level Security');
      expect(migration).toContain('CREATE POLICY');
      expect(migration).toContain('SELECT schemaname');
    });
  });

  describe('policy retrieval', () => {
    it('should get policies for specific table', () => {
      const policies = service.getPoliciesForTable('properties');

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.every((p) => p.table === 'properties')).toBe(true);
    });

    it('should get all policies', () => {
      const policies = service.getAllPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(policies).toContainEqual(
        expect.objectContaining({
          name: expect.any(String),
          table: expect.any(String),
          action: expect.any(String),
        })
      );
    });

    it('should get policy documentation', () => {
      const docs = service.getPolicyDocumentation();

      expect(Object.keys(docs).length).toBeGreaterThan(0);
      expect(docs.properties).toBeDefined();
      expect(docs.properties!.length).toBeGreaterThan(0);
    });
  });

  describe('context management', () => {
    it('should validate RLS context', () => {
      const validContext = {
        userId: 'user:123',
        organizationId: 'org:456',
        roles: ['user'],
        permissions: ['read'],
      };

      expect(service.validateRLSContext(validContext)).toBe(true);
    });

    it('should reject invalid context', () => {
      const invalidContext = {
        userId: '',
        organizationId: 'org:456',
        roles: [],
        permissions: [],
      };

      expect(service.validateRLSContext(invalidContext)).toBe(false);
    });

    it('should generate context setting SQL', () => {
      const context = {
        userId: 'user:123',
        organizationId: 'org:456',
        roles: ['admin'],
        permissions: ['read', 'write'],
      };

      const sqlCommands = service.generateSetContextSQL(context);

      expect(sqlCommands.length).toBeGreaterThan(0);
      expect(sqlCommands[0]).toContain('app.current_user_id');
      expect(sqlCommands[1]).toContain('app.current_organization_id');
    });

    it('should generate context reset SQL', () => {
      const sqlCommands = service.generateResetContextSQL();

      expect(sqlCommands.length).toBeGreaterThan(0);
      expect(sqlCommands[0]).toContain('RESET');
    });
  });

  describe('policy status', () => {
    it('should report RLS status', () => {
      const status = service.getStatus();

      expect(status.totalPolicies).toBeGreaterThan(0);
      expect(status.protectedTables).toBeGreaterThan(0);
      expect(status.tables).toBeDefined();
      expect(status.policyCount).toBeDefined();
    });
  });
});

describe('AuthSecurityService', () => {
  let service: AuthSecurityService;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    service = new AuthSecurityService();
  });

  describe('token generation', () => {
    it('should generate access token', () => {
      const token = service.generateAccessToken({
        userId: 'user:123',
        organizationId: 'org:456',
        roles: ['user'],
        permissions: ['read'],
      });

      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const token = service.generateRefreshToken('user:123');

      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });

    it('should generate different refresh tokens for same user', () => {
      const token1 = service.generateRefreshToken('user:123');
      const token2 = service.generateRefreshToken('user:123');

      expect(token1).not.toBe(token2);
    });
  });

  describe('token verification', () => {
    it('should verify valid access token', () => {
      const payload = {
        userId: 'user:123',
        organizationId: 'org:456',
        roles: ['user'],
        permissions: ['read'],
      };

      const token = service.generateAccessToken(payload);
      const verified = service.verifyToken(token);

      expect(verified.userId).toBe(payload.userId);
      expect(verified.organizationId).toBe(payload.organizationId);
    });

    it('should reject invalid token', () => {
      expect(() => service.verifyToken('invalid-token')).toThrow();
    });

    it('should reject expired token', async () => {
      // Create token that expires immediately
      process.env.JWT_ACCESS_EXPIRY = '0s';
      const serviceWithExpiry = new AuthSecurityService();

      const token = serviceWithExpiry.generateAccessToken({
        userId: 'user:123',
        organizationId: 'org:456',
        roles: ['user'],
        permissions: ['read'],
      });

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(() => serviceWithExpiry.verifyToken(token)).toThrow();

      // Reset
      process.env.JWT_ACCESS_EXPIRY = '15m';
    });

    it('should verify refresh token', () => {
      const token = service.generateRefreshToken('user:123');
      const verified = service.verifyRefreshToken(token);

      expect(verified.userId).toBe('user:123');
      expect(verified.version).toBe(1);
    });
  });

  describe('token revocation', () => {
    it('should revoke token', () => {
      const token = service.generateAccessToken({
        userId: 'user:123',
        organizationId: 'org:456',
        roles: ['user'],
        permissions: [],
      });

      service.revokeToken(token);

      // Revoked token should be rejected
      expect(() => service.verifyToken(token)).toThrow();
    });

    it('should invalidate all user sessions', () => {
      const userId = 'user:123';

      // Create multiple tokens
      const token1 = service.generateRefreshToken(userId);
      const token2 = service.generateRefreshToken(userId);

      // Invalidate all sessions
      service.invalidateUserSessions(userId);

      // New tokens should have different version
      const token3 = service.generateRefreshToken(userId);

      // Old tokens should fail version check
      expect(() => service.verifyRefreshToken(token1)).toThrow();
      expect(() => service.verifyRefreshToken(token2)).toThrow();
    });
  });

  describe('session management', () => {
    it('should register session', () => {
      const userId = 'user:123';
      const deviceId = 'device:abc';
      const token = 'token-xyz';

      service.registerSession(userId, deviceId, token);

      const sessions = service.getActiveSessions(userId);
      expect(sessions).toContain(deviceId);
    });

    it('should terminate specific session', () => {
      const userId = 'user:123';
      const deviceId1 = 'device:abc';
      const deviceId2 = 'device:def';

      service.registerSession(userId, deviceId1, 'token1');
      service.registerSession(userId, deviceId2, 'token2');

      service.terminateSession(userId, deviceId1);

      const sessions = service.getActiveSessions(userId);
      expect(sessions).toContain(deviceId2);
      expect(sessions).not.toContain(deviceId1);
    });
  });

  describe('failed login attempts', () => {
    it('should track failed attempts', () => {
      const identifier = 'user@example.com';

      for (let i = 0; i < 3; i++) {
        const shouldLockout = service.trackFailedAttempt(identifier);
        expect(shouldLockout).toBe(false);
      }

      // 6th attempt should trigger lockout
      for (let i = 3; i < 6; i++) {
        const shouldLockout = service.trackFailedAttempt(identifier);
        if (i === 5) {
          expect(shouldLockout).toBe(true);
        }
      }
    });

    it('should clear failed attempts on success', () => {
      const identifier = 'user@example.com';

      service.trackFailedAttempt(identifier);
      service.trackFailedAttempt(identifier);

      service.clearFailedAttempts(identifier);

      const attempts = service.getFailedAttempts(identifier);
      expect(attempts).toBe(0);
    });
  });

  describe('auth security status', () => {
    it('should report security status', () => {
      const status = service.getStatus();

      expect(status.algorithm).toBeDefined();
      expect(status.accessTokenExpiry).toBeDefined();
      expect(status.refreshTokenExpiry).toBeDefined();
      expect(status.revokedTokens).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('PasswordSecurityUtils', () => {
  describe('password strength validation', () => {
    it('should accept strong passwords', () => {
      const password = 'SecureP@ssw0rd123';
      const result = PasswordSecurityUtils.isStrong(password);

      expect(result.isStrong).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const password = 'Short@1';
      const result = PasswordSecurityUtils.isStrong(password);

      expect(result.isStrong).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('12 characters')
      );
    });

    it('should reject passwords without uppercase', () => {
      const password = 'nouppercase@1234';
      const result = PasswordSecurityUtils.isStrong(password);

      expect(result.isStrong).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('uppercase')
      );
    });

    it('should reject passwords without lowercase', () => {
      const password = 'NOLOWERCASE@1234';
      const result = PasswordSecurityUtils.isStrong(password);

      expect(result.isStrong).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('lowercase'));
    });

    it('should reject passwords without numbers', () => {
      const password = 'NoNumbers@Password';
      const result = PasswordSecurityUtils.isStrong(password);

      expect(result.isStrong).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('number'));
    });

    it('should reject passwords without special chars', () => {
      const password = 'NoSpecialChars1234';
      const result = PasswordSecurityUtils.isStrong(password);

      expect(result.isStrong).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('special character')
      );
    });
  });

  describe('common password detection', () => {
    it('should detect common passwords', () => {
      expect(PasswordSecurityUtils.isCommonPassword('password123')).toBe(true);
      expect(PasswordSecurityUtils.isCommonPassword('admin123')).toBe(true);
      expect(PasswordSecurityUtils.isCommonPassword('qwerty')).toBe(true);
    });

    it('should allow unique passwords', () => {
      expect(
        PasswordSecurityUtils.isCommonPassword('Unique@Pass2024#')
      ).toBe(false);
    });
  });
});
