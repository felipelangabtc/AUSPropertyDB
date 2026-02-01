import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService, EncryptionUtils } from '../encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = 'test-master-key';
    service = new EncryptionService();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data', () => {
      const plaintext = 'sensitive@email.com';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should use different IVs for same plaintext', () => {
      const plaintext = 'password123';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail to decrypt with wrong key', () => {
      const plaintext = 'secret';
      const encrypted = service.encrypt(plaintext);

      // Create new service with different key
      process.env.ENCRYPTION_MASTER_KEY = 'different-key';
      const service2 = new EncryptionService();

      expect(() => service2.decrypt(encrypted)).toThrow();
    });

    it('should support additional authenticated data (AAD)', () => {
      const plaintext = 'data';
      const aad = 'table-name:users';

      const encrypted = service.encrypt(plaintext, aad);
      const decrypted = service.decrypt(encrypted, aad);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong AAD', () => {
      const plaintext = 'data';
      const encrypted = service.encrypt(plaintext, 'correct-aad');

      expect(() => service.decrypt(encrypted, 'wrong-aad')).toThrow();
    });
  });

  describe('field-level encryption', () => {
    it('should identify encrypted fields for users table', () => {
      const encrypted = service.shouldEncryptField('users', 'email');
      expect(encrypted).toBe(true);

      const notEncrypted = service.shouldEncryptField('users', 'address');
      expect(notEncrypted).toBe(false);
    });

    it('should get all encrypted fields for table', () => {
      const fields = service.getEncryptedFields('users');
      expect(fields).toContain('email');
      expect(fields).toContain('phone');
      expect(fields).toContain('ssn');
    });

    it('should encrypt object fields', () => {
      const user = {
        id: 1,
        email: 'john@example.com',
        name: 'John',
        phone: '555-1234',
      };

      const encrypted = service.encryptObject('users', user);

      expect(encrypted.id).toBe(1);
      expect(encrypted.name).toBe('John');
      expect(encrypted.email).not.toBe('john@example.com');
      expect(typeof encrypted.email).toBe('object');
    });

    it('should decrypt object fields', () => {
      const original = {
        id: 1,
        email: 'jane@example.com',
        phone: '555-5678',
      };

      const encrypted = service.encryptObject('users', original);
      const decrypted = service.decryptObject('users', encrypted);

      expect(decrypted.email).toBe('jane@example.com');
      expect(decrypted.phone).toBe('555-5678');
    });
  });

  describe('hash/verify', () => {
    it('should hash and verify data', () => {
      const data = 'password123';
      const hash = service.hash(data);

      const isValid = service.verifyHash(data, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect data', () => {
      const data = 'password123';
      const hash = service.hash(data);

      const isValid = service.verifyHash('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same input', () => {
      const data = 'password123';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).not.toBe(hash2);
      expect(service.verifyHash(data, hash1)).toBe(true);
      expect(service.verifyHash(data, hash2)).toBe(true);
    });
  });

  describe('token generation', () => {
    it('should generate random tokens', () => {
      const token1 = service.generateToken(32);
      const token2 = service.generateToken(32);

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should generate tokens of requested length', () => {
      const token = service.generateToken(64);
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('encryption status', () => {
    it('should report encryption status', () => {
      const status = service.getStatus();

      expect(status.algorithm).toBe('aes-256-gcm');
      expect(status.keyDerivation).toBe('PBKDF2');
      expect(status.iterations).toBeGreaterThanOrEqual(100000);
      expect(status.masterKeySet).toBe(true);
      expect(status.encryptedTablesCount).toBeGreaterThan(0);
    });
  });
});

describe('EncryptionUtils', () => {
  it('should hash PII deterministically', () => {
    const key = Buffer.from('test-key');
    const pii = 'john@example.com';

    const hash1 = EncryptionUtils.hashPII(pii, key);
    const hash2 = EncryptionUtils.hashPII(pii, key);

    expect(hash1).toBe(hash2); // Deterministic
  });

  it('should generate unique nonces', () => {
    const nonce1 = EncryptionUtils.generateNonce();
    const nonce2 = EncryptionUtils.generateNonce();

    expect(nonce1).not.toBe(nonce2);
  });

  it('should derive multiple keys from master key', () => {
    const masterKey = Buffer.from('master-key');
    const salt = Buffer.from('salt');

    const keys = EncryptionUtils.deriveKeys(masterKey, salt);

    expect(keys.encryptionKey).toBeDefined();
    expect(keys.authKey).toBeDefined();
    expect(keys.indexKey).toBeDefined();
    expect(keys.encryptionKey).not.toEqual(keys.authKey);
  });
});
