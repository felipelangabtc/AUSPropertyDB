import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface TraefikService {
  name: string;
  loadBalancer: {
    servers: Array<{ url: string }>;
  };
}

export interface TraefikRouter {
  name: string;
  entryPoints: string[];
  service: string;
  rule: string;
  middlewares?: string[];
  tls?: {
    certResolver?: string;
  };
}

export interface TraefikMiddleware {
  name: string;
  type: 'rateLimit' | 'retry' | 'circuitBreaker' | 'cors' | 'basicAuth' | 'stripPrefix';
  config: Record<string, any>;
}

export interface AdvancedRateLimiter {
  strategy: 'token-bucket' | 'leaky-bucket' | 'sliding-window' | 'fixed-window';
  capacity: number;
  refillRate: number; // tokens per second
  perIP?: boolean;
  perUser?: boolean;
  perEndpoint?: boolean;
}

@Injectable()
export class TraefikGatewayService {
  private readonly logger = new Logger(TraefikGatewayService.name);
  private traefikClient: AxiosInstance;
  private configPath: string;

  constructor(private configService: ConfigService) {
    const traefikApiUrl = this.configService.get(
      'TRAEFIK_API_URL',
      'http://localhost:8080'
    );

    this.configPath = this.configService.get(
      'TRAEFIK_CONFIG_PATH',
      '/etc/traefik'
    );

    this.traefikClient = axios.create({
      baseURL: traefikApiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all services
   */
  async getAllServices(): Promise<any> {
    try {
      const response = await this.traefikClient.get('/api/http/services');
      this.logger.log(`Retrieved ${response.data.length} services`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get services: ${error.message}`);
      return [];
    }
  }

  /**
   * Get service details
   */
  async getService(serviceName: string): Promise<any> {
    try {
      const response = await this.traefikClient.get(
        `/api/http/services/${serviceName}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get service ${serviceName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all routers
   */
  async getAllRouters(): Promise<any> {
    try {
      const response = await this.traefikClient.get('/api/http/routers');
      this.logger.log(`Retrieved ${response.data.length} routers`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get routers: ${error.message}`);
      return [];
    }
  }

  /**
   * Get router details
   */
  async getRouter(routerName: string): Promise<any> {
    try {
      const response = await this.traefikClient.get(
        `/api/http/routers/${routerName}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get router ${routerName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all middlewares
   */
  async getAllMiddlewares(): Promise<any> {
    try {
      const response = await this.traefikClient.get('/api/http/middlewares');
      this.logger.log(`Retrieved ${response.data.length} middlewares`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get middlewares: ${error.message}`);
      return [];
    }
  }

  /**
   * Check Traefik health
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await this.traefikClient.get('/ping');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Traefik health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get Traefik entrypoints
   */
  async getEntrypoints(): Promise<any> {
    try {
      const response = await this.traefikClient.get('/api/entrypoints');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get entrypoints: ${error.message}`);
      return [];
    }
  }

  /**
   * Build rate limiting middleware configuration
   */
  buildRateLimitMiddleware(
    config: AdvancedRateLimiter
  ): Record<string, any> {
    const baseConfig = {
      average: config.capacity,
      burst: Math.ceil(config.capacity * 1.5),
      period: `${Math.ceil(1 / config.refillRate)}s`,
    };

    if (config.perIP) {
      return {
        ...baseConfig,
        sourceCriterion: {
          ipStrategy: {
            depth: 1,
            excludedIPs: ['127.0.0.1'],
          },
        },
      };
    }

    if (config.perUser) {
      return {
        ...baseConfig,
        sourceCriterion: {
          requestHeaderName: 'X-User-ID',
        },
      };
    }

    return baseConfig;
  }

  /**
   * Build circuit breaker middleware
   */
  buildCircuitBreakerMiddleware(config: {
    expression: string;
    checkPeriod?: string;
    fallbackDuration?: string;
  }): Record<string, any> {
    return {
      expression: config.expression,
      checkPeriod: config.checkPeriod || '100ms',
      fallback: {
        service: 'fallback-service',
      },
    };
  }

  /**
   * Build retry middleware
   */
  buildRetryMiddleware(config: {
    attempts?: number;
    initialInterval?: string;
    backoff?: number;
  }): Record<string, any> {
    return {
      attempts: config.attempts || 3,
      initialInterval: config.initialInterval || '100ms',
      backoff: config.backoff || 2,
      maxAttempts: 5,
    };
  }

  /**
   * Build CORS middleware
   */
  buildCORSMiddleware(config: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  }): Record<string, any> {
    return {
      accessControlAllowOriginList: config.allowedOrigins,
      accessControlAllowMethods: config.allowedMethods,
      accessControlAllowHeaders: config.allowedHeaders,
      accessControlExposeHeaders: [
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
      ],
      accessControlMaxAge: 3600,
      accessControlAllowCredentials: true,
    };
  }

  /**
   * Build authentication middleware (basic auth)
   */
  buildBasicAuthMiddleware(users: string[]): Record<string, any> {
    return {
      users: users, // Format: ["user:password", ...]
      realm: 'Restricted Area',
      removeHeader: false,
    };
  }

  /**
   * Build compression middleware
   */
  buildCompressionMiddleware(config: {
    minResponseBodyBytes?: number;
    excludedContentTypes?: string[];
  }): Record<string, any> {
    return {
      minResponseBodyBytes: config.minResponseBodyBytes || 1024,
      excludedContentTypes: config.excludedContentTypes || [
        'image/jpeg',
        'image/png',
        'image/gif',
      ],
      level: 5, // 1-9, default 5
    };
  }

  /**
   * Build strip prefix middleware
   */
  buildStripPrefixMiddleware(prefixes: string[]): Record<string, any> {
    return {
      prefixes: prefixes,
      forceSlash: true,
    };
  }

  /**
   * Build request transformer middleware
   */
  buildRequestTransformerMiddleware(config: {
    addHeaders?: Record<string, string>;
    removeHeaders?: string[];
    addQueryParams?: Record<string, string>;
    removeQueryParams?: string[];
  }): Record<string, any> {
    return {
      headers: {
        names: config.addHeaders || {},
        remove: config.removeHeaders || [],
      },
      query: {
        add: config.addQueryParams || {},
        remove: config.removeQueryParams || [],
      },
    };
  }

  /**
   * Load and parse Traefik static configuration
   */
  async loadStaticConfig(): Promise<Record<string, any>> {
    try {
      const fs = await import('fs').then(m => m.promises);
      const yaml = await import('js-yaml');

      const configContent = await fs.readFile(
        `${this.configPath}/traefik.yml`,
        'utf-8'
      );
      return yaml.load(configContent) as Record<string, any>;
    } catch (error) {
      this.logger.error(`Failed to load static config: ${error.message}`);
      return {};
    }
  }

  /**
   * Load and parse Traefik dynamic configuration
   */
  async loadDynamicConfig(): Promise<Record<string, any>> {
    try {
      const fs = await import('fs').then(m => m.promises);
      const yaml = await import('js-yaml');

      const configContent = await fs.readFile(
        `${this.configPath}/dynamic.yml`,
        'utf-8'
      );
      return yaml.load(configContent) as Record<string, any>;
    } catch (error) {
      this.logger.error(`Failed to load dynamic config: ${error.message}`);
      return {};
    }
  }

  /**
   * Generate Traefik static configuration
   */
  generateStaticConfig(config: {
    entryPoints: { http: { address: string }; https: { address: string } };
    api?: { insecure: boolean; dashboard: boolean };
    providers?: { file?: { filename: string }; docker?: Record<string, any> };
  }): Record<string, any> {
    return {
      global: {
        checkNewVersion: true,
        sendAnonymousUsage: false,
      },
      entryPoints: config.entryPoints,
      api: config.api || {
        insecure: false,
        dashboard: true,
      },
      providers: config.providers || {
        file: {
          filename: `${this.configPath}/dynamic.yml`,
          watch: true,
        },
        docker: {
          endpoint: 'unix:///var/run/docker.sock',
          exposedByDefault: false,
        },
      },
      log: {
        level: 'INFO',
        filePath: '/var/log/traefik/traefik.log',
      },
      accessLog: {
        filePath: '/var/log/traefik/access.log',
      },
    };
  }
}
