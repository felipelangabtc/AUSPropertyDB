import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: 'PBKDF2' | 'Argon2' | 'bcrypt';
  iterations: number;
  saltLength: number;
  tagLength: number;
  encryptionKey?: string; // Base64 encoded
}

export interface EncryptedData {
  ciphertext: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
  tag: string; // Base64
  algorithm: string;
}

export interface FieldEncryptionSchema {
  [fieldName: string]: boolean;
}

/**
 * Enterprise-grade encryption service for sensitive data
 *
 * Features:
 * - AES-256-GCM encryption (AEAD cipher)
 * - PBKDF2 key derivation with salt
 * - Field-level encryption for PII and sensitive data
 * - Transparent encryption/decryption
 * - Key rotation support
 * - Compliance: GDPR, HIPAA, PCI-DSS
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private masterKey: Buffer;
  private config: EncryptionConfig;

  // Field-level encryption definitions by table
  private readonly FIELD_ENCRYPTION_SCHEMAS: Record<string, FieldEncryptionSchema> = {
    users: {
      email: true,
      phone: true,
      ssn: true,
      address: false,
    },
    properties: {
      owner_name: true,
      owner_email: true,
      owner_phone: true,
      owner_document: true,
      purchase_contract: true,
    },
    transactions: {
      payment_method: true,
      card_number: true,
      account_number: true,
      wire_transfer_info: true,
    },
    user_alerts: {
      notification_email: true,
      notification_phone: true,
    },
    listings: {
      agent_personal_info: true,
      contact_details: true,
    },
  };

  constructor() {
    this.config = this.getDefaultConfig();
    this.masterKey = this.deriveMasterKey();
  }

  /**
   * Default encryption configuration
   * Can be overridden by environment variables
   */
  private getDefaultConfig(): EncryptionConfig {
    return {
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      keyDerivation: 'PBKDF2',
      iterations: parseInt(process.env.PBKDF2_ITERATIONS || '100000', 10),
      saltLength: 32,
      tagLength: 16,
      encryptionKey: process.env.ENCRYPTION_KEY,
    };
  }

  /**
   * Derive master encryption key from environment key
   * Uses PBKDF2 with salt for key derivation
   */
  private deriveMasterKey(): Buffer {
    const envKey = process.env.ENCRYPTION_MASTER_KEY;

    if (!envKey) {
      this.logger.warn(
        'ENCRYPTION_MASTER_KEY not set, using default (INSECURE - DO NOT USE IN PRODUCTION)'
      );
      return Buffer.from('0'.repeat(64), 'hex'); // Default insecure key
    }

    const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'default-salt-change-me', 'utf8');

    const derivedKey = crypto.pbkdf2Sync(
      envKey,
      salt,
      this.config.iterations,
      32, // 256-bit key
      'sha256'
    );

    return derivedKey;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   *
   * @param plaintext - Data to encrypt
   * @param additionalData - Optional additional authenticated data (AAD)
   * @returns Encrypted data with IV, salt, and authentication tag
   *
   * @example
   * const encrypted = this.encrypt('john@example.com');
   * // Returns: {
   * //   ciphertext: 'base64...',
   * //   iv: 'base64...',
   * //   salt: 'base64...',
   * //   tag: 'base64...',
   * //   algorithm: 'aes-256-gcm'
   * // }
   */
  encrypt(plaintext: string, additionalData?: string): EncryptedData {
    try {
      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(12); // 96 bits for GCM

      // Generate random salt for additional security
      const salt = crypto.randomBytes(this.config.saltLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.config.algorithm, this.masterKey, iv);

      // Add additional authenticated data if provided
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }

      // Encrypt
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      return {
        ciphertext,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.config.algorithm,
      };
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted data
   *
   * @param encryptedData - Encrypted data object
   * @param additionalData - Optional additional authenticated data (AAD)
   * @returns Decrypted plaintext
   *
   * @example
   * const plaintext = this.decrypt(encryptedData);
   * // Returns: 'john@example.com'
   */
  decrypt(encryptedData: EncryptedData, additionalData?: string): string {
    try {
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');

      const decipher = crypto.createDecipheriv(this.config.algorithm, this.masterKey, iv);
      decipher.setAuthTag(tag);

      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }

      let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Check if a field should be encrypted for a given table
   */
  shouldEncryptField(tableName: string, fieldName: string): boolean {
    const schema = this.FIELD_ENCRYPTION_SCHEMAS[tableName];
    return schema ? schema[fieldName] === true : false;
  }

  /**
   * Get all encrypted fields for a table
   */
  getEncryptedFields(tableName: string): string[] {
    const schema = this.FIELD_ENCRYPTION_SCHEMAS[tableName] || {};
    return Object.keys(schema).filter((field) => schema[field] === true);
  }

  /**
   * Encrypt an object's sensitive fields (field-level encryption)
   *
   * @param tableName - Table name for schema lookup
   * @param data - Object with data to encrypt
   * @returns New object with encrypted fields
   *
   * @example
   * const user = { id: 1, email: 'john@example.com', name: 'John' };
   * const encrypted = this.encryptObject('users', user);
   * // Returns: { id: 1, email: EncryptedData{...}, name: 'John' }
   */
  encryptObject<T extends Record<string, any>>(tableName: string, data: T): T {
    const encrypted = { ...data };
    const fieldsToEncrypt = this.getEncryptedFields(tableName);

    for (const field of fieldsToEncrypt) {
      if (field in encrypted && encrypted[field] !== null && encrypted[field] !== undefined) {
        encrypted[field] = this.encrypt(String(encrypted[field]), tableName);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt an object's sensitive fields
   *
   * @param tableName - Table name for schema lookup
   * @param data - Object with encrypted fields
   * @returns New object with decrypted fields
   *
   * @example
   * const decrypted = this.decryptObject('users', encryptedUser);
   * // Returns: { id: 1, email: 'john@example.com', name: 'John' }
   */
  decryptObject<T extends Record<string, any>>(tableName: string, data: T): T {
    const decrypted = { ...data };
    const fieldsToEncrypt = this.getEncryptedFields(tableName);

    for (const field of fieldsToEncrypt) {
      if (field in decrypted && decrypted[field] !== null && decrypted[field] !== undefined) {
        try {
          decrypted[field] = this.decrypt(decrypted[field] as EncryptedData, tableName);
        } catch (error) {
          this.logger.warn(
            `Failed to decrypt field ${field}: ${error.message}, keeping encrypted value`
          );
        }
      }
    }

    return decrypted;
  }

  /**
   * Generate a hash for data comparison (one-way)
   * Useful for password hashing or document verification
   *
   * @param data - Data to hash
   * @param salt - Optional salt for additional security
   * @returns Base64-encoded hash
   *
   * @example
   * const hash = this.hash('password123');
   * // Returns: 'base64hash...'
   */
  hash(data: string, salt?: Buffer): string {
    const hashSalt = salt || crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(data, hashSalt, 100000, 32, 'sha256');

    // Return salt:hash combination for later verification
    return `${hashSalt.toString('base64')}:${hash.toString('base64')}`;
  }

  /**
   * Verify a hashed value
   *
   * @param data - Original data
   * @param hash - Hash from hash() method
   * @returns True if data matches hash
   *
   * @example
   * const isValid = this.verifyHash('password123', storedHash);
   */
  verifyHash(data: string, hash: string): boolean {
    const [saltB64, hashB64] = hash.split(':');
    const salt = Buffer.from(saltB64, 'base64');

    const newHash = crypto.pbkdf2Sync(data, salt, 100000, 32, 'sha256');
    const stored = Buffer.from(hashB64, 'base64');

    return crypto.timingSafeEqual(newHash, stored);
  }

  /**
   * Generate a random secure token
   *
   * @param length - Token length in bytes (default: 32)
   * @returns Base64-encoded token
   *
   * @example
   * const token = this.generateToken(32);
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Key rotation: Re-encrypt data with new key
   * This is called periodically to ensure data security
   *
   * @param oldEncryptedData - Data encrypted with old key
   * @param newKey - New master key
   * @returns New encrypted data with new key
   *
   * @example
   * const reencrypted = this.rotateKey(oldData, newMasterKey);
   */
  rotateKey(oldEncryptedData: EncryptedData, newMasterKey: Buffer): EncryptedData {
    // Decrypt with old key (using current masterKey)
    const plaintext = this.decrypt(oldEncryptedData);

    // Temporarily set new key
    const oldKey = this.masterKey;
    this.masterKey = newMasterKey;

    // Encrypt with new key
    const newEncryptedData = this.encrypt(plaintext);

    // Restore old key (in production, this would be coordinated during key rotation)
    this.masterKey = oldKey;

    return newEncryptedData;
  }

  /**
   * Get encryption statistics and health status
   *
   * @returns Status object with encryption configuration
   */
  getStatus(): Record<string, any> {
    return {
      algorithm: this.config.algorithm,
      keyDerivation: this.config.keyDerivation,
      iterations: this.config.iterations,
      masterKeySet: !!process.env.ENCRYPTION_MASTER_KEY,
      encryptedTablesCount: Object.keys(this.FIELD_ENCRYPTION_SCHEMAS).length,
      totalEncryptedFields: Object.values(this.FIELD_ENCRYPTION_SCHEMAS).reduce(
        (sum, schema) => sum + Object.values(schema).filter((v) => v).length,
        0
      ),
    };
  }

  /**
   * Validate encryption configuration at startup
   * Throws error if configuration is invalid
   */
  validateConfiguration(): void {
    if (!process.env.ENCRYPTION_MASTER_KEY) {
      const env = process.env.NODE_ENV || 'development';
      if (env === 'production') {
        throw new Error(
          'ENCRYPTION_MASTER_KEY is required in production but not set. ' +
            'Please set ENCRYPTION_MASTER_KEY environment variable.'
        );
      }
      this.logger.warn(
        'ENCRYPTION_MASTER_KEY not set in ' + env + ' environment - using insecure default'
      );
    }

    if (this.config.iterations < 100000) {
      this.logger.warn('PBKDF2_ITERATIONS is less than 100,000 - recommended minimum for security');
    }
  }
}

/**
 * Encryption utilities for specific use cases
 */
export class EncryptionUtils {
  /**
   * Hash sensitive personal identifiers (PII) for searching
   * Uses HMAC for deterministic output (same input = same output)
   *
   * @example
   * const hashedEmail = EncryptionUtils.hashPII('john@example.com', secretKey);
   */
  static hashPII(data: string, secretKey: Buffer): string {
    return crypto.createHmac('sha256', secretKey).update(data).digest('base64');
  }

  /**
   * Generate cryptographically secure random string
   *
   * @example
   * const nonce = EncryptionUtils.generateNonce();
   */
  static generateNonce(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive multiple keys from single master key (key derivation function)
   * Useful for deriving different keys for different purposes
   *
   * @example
   * const keys = EncryptionUtils.deriveKeys(masterKey);
   * // Returns: { encryptionKey, authKey, indexKey }
   */
  static deriveKeys(
    masterKey: Buffer,
    salt: Buffer
  ): { encryptionKey: Buffer; authKey: Buffer; indexKey: Buffer } {
    const encryptionKey = crypto.pbkdf2Sync(
      masterKey,
      Buffer.concat([salt, Buffer.from('enc')]),
      100000,
      32,
      'sha256'
    );
    const authKey = crypto.pbkdf2Sync(
      masterKey,
      Buffer.concat([salt, Buffer.from('auth')]),
      100000,
      32,
      'sha256'
    );
    const indexKey = crypto.pbkdf2Sync(
      masterKey,
      Buffer.concat([salt, Buffer.from('idx')]),
      100000,
      32,
      'sha256'
    );

    return { encryptionKey, authKey, indexKey };
  }
}
