import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface KongService {
  name: string;
  url: string;
  protocol: string;
  port: number;
  host?: string;
}

export interface KongRoute {
  name: string;
  service: string;
  paths: string[];
  methods?: string[];
  protocols?: string[];
  strip_path?: boolean;
  preserve_host?: boolean;
}

export interface KongPlugin {
  name: string;
  service?: string;
  route?: string;
  config: Record<string, any>;
  enabled?: boolean;
}

export interface RateLimitConfig {
  service: string;
  limits: {
    requests: number;
    window: number; // in seconds
  };
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket';
  redisCluster?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

@Injectable()
export class KongGatewayService {
  private readonly logger = new Logger(KongGatewayService.name);
  private kongClient: AxiosInstance;
  private kongAdminUrl: string;
  private kongProxyUrl: string;

  constructor(private configService: ConfigService) {
    this.kongAdminUrl = this.configService.get('KONG_ADMIN_URL', 'http://localhost:8001');
    this.kongProxyUrl = this.configService.get('KONG_PROXY_URL', 'http://localhost:8000');

    this.kongClient = axios.create({
      baseURL: this.kongAdminUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Register a new upstream service in Kong
   */
  async registerService(service: KongService): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.post('/services', {
        name: service.name,
        url: `${service.protocol}://${service.host || 'localhost'}:${service.port}`,
        protocol: service.protocol,
        host: service.host || 'localhost',
        port: service.port,
        connect_timeout: 60000,
        send_timeout: 60000,
        read_timeout: 60000,
        retries: 3,
      });

      this.logger.log(`Service registered: ${service.name} (${service.url})`);
      return {
        success: true,
        data: response.data,
        message: `Service '${service.name}' registered successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to register service: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create routes for a service
   */
  async createRoute(route: KongRoute): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.post(`/services/${route.service}/routes`, {
        name: route.name,
        paths: route.paths,
        methods: route.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        protocols: route.protocols || ['http', 'https'],
        strip_path: route.strip_path ?? true,
        preserve_host: route.preserve_host ?? false,
      });

      this.logger.log(`Route created: ${route.name} → ${route.paths.join(', ')}`);
      return {
        success: true,
        data: response.data,
        message: `Route '${route.name}' created successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to create route: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Apply rate limiting plugin
   */
  async applyRateLimiting(config: RateLimitConfig): Promise<ApiResponse> {
    try {
      const pluginConfig = this.buildRateLimitingConfig(config);

      const response = await this.kongClient.post(`/services/${config.service}/plugins`, {
        name: 'rate-limiting',
        config: pluginConfig,
      });

      this.logger.log(
        `Rate limiting applied: ${config.service} (${config.limits.requests}/${config.limits.window}s)`
      );
      return {
        success: true,
        data: response.data,
        message: `Rate limiting configured for '${config.service}'`,
      };
    } catch (error) {
      this.logger.error(`Failed to apply rate limiting: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Apply authentication plugin
   */
  async applyAuthentication(
    service: string,
    authType: 'jwt' | 'oauth2' | 'key-auth'
  ): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.post(`/services/${service}/plugins`, {
        name: authType,
        config: this.buildAuthConfig(authType),
      });

      this.logger.log(`Authentication applied: ${service} (${authType})`);
      return {
        success: true,
        data: response.data,
        message: `${authType} authentication enabled for '${service}'`,
      };
    } catch (error) {
      this.logger.error(`Failed to apply authentication: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Apply CORS plugin
   */
  async applyCORS(service: string, origins: string[]): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.post(`/services/${service}/plugins`, {
        name: 'cors',
        config: {
          origins: origins,
          methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
          headers: [
            'Accept',
            'Accept-Version',
            'Content-Length',
            'Content-MD5',
            'Content-Type',
            'Date',
            'X-Auth-Token',
            'Authorization',
          ],
          expose_headers: [
            'X-Auth-Token',
            'X-Rate-Limit-Limit',
            'X-Rate-Limit-Remaining',
            'X-Rate-Limit-Reset',
          ],
          credentials: true,
          max_age: 3600,
        },
      });

      this.logger.log(`CORS enabled: ${service} (origins: ${origins.join(', ')})`);
      return {
        success: true,
        data: response.data,
        message: `CORS configured for '${service}'`,
      };
    } catch (error) {
      this.logger.error(`Failed to apply CORS: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Apply request validation plugin
   */
  async applyRequestValidation(
    service: string,
    validationRules: Record<string, any>
  ): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.post(`/services/${service}/plugins`, {
        name: 'request-validator',
        config: {
          body_schema: JSON.stringify(validationRules),
        },
      });

      this.logger.log(`Request validation applied: ${service}`);
      return {
        success: true,
        data: response.data,
        message: `Request validation configured for '${service}'`,
      };
    } catch (error) {
      this.logger.error(`Failed to apply request validation: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get service details
   */
  async getService(serviceName: string): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.get(`/services/${serviceName}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to get service: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all routes
   */
  async getAllRoutes(): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.get('/routes');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to get routes: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a service
   */
  async deleteService(serviceName: string): Promise<ApiResponse> {
    try {
      await this.kongClient.delete(`/services/${serviceName}`);
      this.logger.log(`Service deleted: ${serviceName}`);
      return {
        success: true,
        message: `Service '${serviceName}' deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete service: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check Kong health
   */
  async checkHealth(): Promise<ApiResponse> {
    try {
      const response = await this.kongClient.get('/status');
      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          stats: response.data,
        },
      };
    } catch (error) {
      this.logger.error(`Kong health check failed: ${error.message}`);
      return {
        success: false,
        error: 'Kong is not responding',
      };
    }
  }

  /**
   * Build rate limiting configuration
   */
  private buildRateLimitingConfig(config: RateLimitConfig): Record<string, any> {
    const baseConfig = {
      limit: [config.limits.requests],
      window_size: [config.limits.window],
      key_type: 'consumer',
      policy: config.strategy === 'token-bucket' ? 'local' : 'redis',
      hide_client_headers: false,
      redis_host: config.redisCluster ? 'redis-cluster' : 'redis',
      redis_port: 6379,
      redis_database: 0,
    };

    if (config.strategy === 'sliding-window') {
      return {
        ...baseConfig,
        sync_rate: -1, // Force local counting
      };
    }

    return baseConfig;
  }

  /**
   * Build authentication configuration
   */
  private buildAuthConfig(authType: 'jwt' | 'oauth2' | 'key-auth'): Record<string, any> {
    switch (authType) {
      case 'jwt':
        return {
          secret_is_base64: false,
          key_claim_name: 'iss',
          cookie_same_site: 'Lax',
          cookie_secure: true,
          claims_to_verify: ['exp'],
          algorithm: ['HS256', 'RS256'],
        };
      case 'oauth2':
        return {
          scopes: ['read', 'write', 'admin'],
          token_expiration: 3600,
          provision_key: true,
          anonymous: false,
        };
      case 'key-auth':
        return {
          key_names: ['apikey', 'x-api-key'],
          key_in_body: false,
          hide_credentials: true,
          anonymous: false,
        };
      default:
        return {};
    }
  }
}
