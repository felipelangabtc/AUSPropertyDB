import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  name: string;
  patterns: RegExp[];
  severity: 'warning' | 'error';
  message: string;
}

/**
 * Input Validation Middleware
 *
 * Protects against:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Path Traversal
 * - Command Injection
 * - XXE (XML External Entity)
 * - Prototype Pollution
 *
 * Sanitizes all inputs:
 * - Query parameters
 * - Request body
 * - URL paths
 * - Headers (selected)
 */
@Injectable()
export class InputValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(InputValidationMiddleware.name);

  /**
   * Detection patterns for common attack vectors
   */
  private readonly validationRules: ValidationRule[] = [
    // ============ SQL INJECTION PATTERNS ============
    {
      name: 'sql-injection',
      patterns: [
        /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|SCRIPT)\b)/gi,
        /('|"|`|\\\\\)|;|\/\*|\*\/|--)/g,
        /(OR\s+1\s*=\s*1)|('; DROP)/gi,
        /(\bOR\b.*\b(1|TRUE)\b.*\b(=|==)\b.*\b(1|TRUE)\b)/gi,
      ],
      severity: 'error',
      message: 'Potential SQL injection detected',
    },

    // ============ XSS PATTERNS ============
    {
      name: 'xss',
      patterns: [
        /(<script|javascript:|onerror=|onload=|onclick=|<iframe|<object|<embed)/gi,
        /(&lt;script|&#|&#x)/gi,
        /(alert\(|eval\(|confirm\(|prompt\()/gi,
        /(<img.*?src=|<svg.*?onload=)/gi,
      ],
      severity: 'error',
      message: 'Potential XSS attack detected',
    },

    // ============ PATH TRAVERSAL PATTERNS ============
    {
      name: 'path-traversal',
      patterns: [
        /(\.\.|\\\\|\.\\/|\/\.\.\/)/g,
        /(%2e%2e|%252e%252e)/gi,
        /(\.\.\\|\.\.\/)/g,
      ],
      severity: 'error',
      message: 'Potential path traversal attack detected',
    },

    // ============ COMMAND INJECTION PATTERNS ============
    {
      name: 'command-injection',
      patterns: [
        /(;|\||\||`|\$\(|&&)/g,
        /(\bsh\b|\bbash\b|\bcmd\b|\bpowershell\b)/gi,
        /(>\s*\/dev\/null|>\s*NUL)/gi,
      ],
      severity: 'error',
      message: 'Potential command injection detected',
    },

    // ============ XXE PATTERNS ============
    {
      name: 'xxe',
      patterns: [
        /<!ENTITY|SYSTEM\s+"|PUBLIC\s+"/gi,
        /(\?xml|CDATA\[)/gi,
      ],
      severity: 'error',
      message: 'Potential XXE attack detected',
    },

    // ============ PROTOTYPE POLLUTION PATTERNS ============
    {
      name: 'prototype-pollution',
      patterns: [
        /(__proto__|constructor|prototype)/g,
      ],
      severity: 'warning',
      message: 'Potential prototype pollution detected',
    },

    // ============ LDAP INJECTION PATTERNS ============
    {
      name: 'ldap-injection',
      patterns: [
        /(\*|\\x2a|\(|\)|\\x28|\\x29)/g,
        /((\(|\||\&)\s*\()/gi,
      ],
      severity: 'error',
      message: 'Potential LDAP injection detected',
    },
  ];

  /**
   * Fields that should never be processed as complex objects
   * (to prevent prototype pollution)
   */
  private readonly forbiddenKeys = [
    '__proto__',
    'constructor',
    'prototype',
    'password',
    'apiKey',
    'token',
    'secret',
  ];

  /**
   * Fields that are safe to contain special characters
   */
  private readonly allowedFieldPatterns: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\//,
    json: /^[\{\[\"]/, // JSON start characters
    base64: /^[A-Za-z0-9+/=]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    phone: /^[\d\s+\-().]+$/,
    address: /^[a-zA-Z0-9\s,.\-#]+$/,
  };

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Validate and sanitize all inputs
      this.validateRequest(req);

      // Add sanitized versions to request
      (req as any).sanitized = {
        query: this.sanitizeObject(req.query),
        body: this.sanitizeObject(req.body),
        params: this.sanitizeObject(req.params),
      };

      next();
    } catch (error) {
      this.logger.warn(`Validation error: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Validate entire request
   */
  private validateRequest(req: Request): void {
    // Validate query parameters
    if (Object.keys(req.query).length > 0) {
      this.validateObject(req.query, 'query');
    }

    // Validate request body
    if (req.body && Object.keys(req.body).length > 0) {
      this.validateObject(req.body, 'body');
    }

    // Validate URL parameters
    if (req.params && Object.keys(req.params).length > 0) {
      this.validateObject(req.params, 'params');
    }

    // Validate selected headers
    this.validateHeaders(req);
  }

  /**
   * Validate object fields for attack patterns
   */
  private validateObject(obj: Record<string, any>, source: string): void {
    for (const [key, value] of Object.entries(obj)) {
      // Check for forbidden keys
      if (this.forbiddenKeys.includes(key.toLowerCase())) {
        throw new BadRequestException(`Forbidden field: ${key}`);
      }

      // Validate key name
      if (!this.isValidKey(key)) {
        throw new BadRequestException(`Invalid field name: ${key}`);
      }

      // Validate value
      if (typeof value === 'string') {
        this.validateString(value, key, source);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively validate nested objects
        this.validateObject(value, source);
      }
    }
  }

  /**
   * Validate string value against attack patterns
   */
  private validateString(value: string, fieldName: string, source: string): void {
    // Skip validation for known-safe fields
    if (this.isSafeField(fieldName)) {
      return;
    }

    // Skip if value matches allowed patterns
    if (this.matchesAllowedPattern(fieldName, value)) {
      return;
    }

    // Check against all validation rules
    for (const rule of this.validationRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(value)) {
          const message = `${rule.message} in ${source}.${fieldName}`;

          if (rule.severity === 'error') {
            throw new BadRequestException(message);
          } else {
            this.logger.warn(message);
          }
        }
      }
    }
  }

  /**
   * Validate request headers
   */
  private validateHeaders(req: Request): void {
    const dangerousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-original-url',
    ];

    for (const header of dangerousHeaders) {
      const value = req.get(header);
      if (value) {
        this.validateString(value, header, 'headers');
      }
    }
  }

  /**
   * Check if key name is valid (alphanumeric, underscore, dash)
   */
  private isValidKey(key: string): boolean {
    return /^[a-zA-Z0-9_\-]+$/.test(key);
  }

  /**
   * Check if field is known-safe and can skip validation
   */
  private isSafeField(fieldName: string): boolean {
    const safeFields = [
      'id',
      'uuid',
      'timestamp',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'version',
      'status',
      'type',
      'sort',
      'limit',
      'offset',
      'page',
      'search',
      'filter',
      'category',
      'suburb',
      'state',
      'country',
    ];

    return safeFields.includes(fieldName.toLowerCase());
  }

  /**
   * Check if value matches allowed pattern for field
   */
  private matchesAllowedPattern(fieldName: string, value: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();

    for (const [pattern, regex] of Object.entries(this.allowedFieldPatterns)) {
      if (lowerFieldName.includes(pattern) && regex.test(value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sanitize object by removing dangerous characters
   */
  private sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value, key);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string' ? this.sanitizeString(item, key) : item
        );
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string by removing/escaping dangerous characters
   */
  private sanitizeString(str: string, fieldName: string): string {
    // If field is allowed to have special characters, don't sanitize
    if (this.matchesAllowedPattern(fieldName, str)) {
      return str;
    }

    // HTML entity encoding
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Get validation statistics
   */
  getStatus(): Record<string, any> {
    return {
      rulesCount: this.validationRules.length,
      rules: this.validationRules.map((r) => ({
        name: r.name,
        patterns: r.patterns.length,
        severity: r.severity,
      })),
      forbiddenKeys: this.forbiddenKeys,
      allowedPatterns: Object.keys(this.allowedFieldPatterns),
    };
  }
}

/**
 * Sanitization utilities
 */
export class SanitizationUtils {
  /**
   * HTML entity encoding
   */
  static encodeHTML(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * URL encoding
   */
  static encodeURL(str: string): string {
    return encodeURIComponent(str);
  }

  /**
   * Remove null bytes and control characters
   */
  static removeControlCharacters(str: string): string {
    return str.replace(/[\x00-\x1F\x7F]/g, '');
  }

  /**
   * Escape regex special characters
   */
  static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate and clean email
   */
  static cleanEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Validate and clean URL
   */
  static cleanURL(url: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      throw new Error('Invalid URL');
    }
  }

  /**
   * Validate and clean UUID
   */
  static cleanUUID(uuid: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new Error('Invalid UUID format');
    }
    return uuid.toLowerCase();
  }
}
