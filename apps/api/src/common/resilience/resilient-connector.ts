import { Injectable } from '@nestjs/common';
import { CircuitBreaker, circuitBreakerRegistry } from '../common/resilience/circuit-breaker';
import { logger } from '@aus-prop/observability';
import axios, { AxiosInstance } from 'axios';

/**
 * Base Connector with Circuit Breaker Protection
 * Wraps all external API calls with circuit breaker pattern
 */
@Injectable()
export class ResilientConnectorBase {
  protected breaker: CircuitBreaker;
  protected client: AxiosInstance;

  constructor(protected connectorName: string) {
    // Get or create circuit breaker for this connector
    this.breaker = circuitBreakerRegistry.getBreaker(
      connectorName,
      {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        onStateChange: (from, to) => {
          logger.warn(`[${connectorName}] Circuit breaker state changed`, {
            from,
            to,
          });
        },
      },
    );
  }

  /**
   * Make HTTP request with circuit breaker protection
   */
  async makeRequest<T>(url: string, config?: any): Promise<T> {
    if (!this.breaker.isAvailable()) {
      logger.warn(`[${this.connectorName}] Circuit breaker is open, using fallback`, {
        url,
      });
      return this.getFallbackData() as T;
    }

    try {
      return await this.breaker.execute(async () => {
        const response = await this.client.get<T>(url, config);
        return response.data;
      });
    } catch (error) {
      logger.error(`[${this.connectorName}] Request failed`, {
        url,
        error: (error as Error).message,
        circuitBreakerState: this.breaker.getState(),
      });

      // If circuit is open, return fallback
      if (!this.breaker.isAvailable()) {
        return this.getFallbackData() as T;
      }

      throw error;
    }
  }

  /**
   * Get fallback data when circuit is open
   */
  protected getFallbackData(): any {
    return {
      results: [],
      message: 'Circuit breaker open - returning cached/fallback data',
    };
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return this.breaker.getMetrics();
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.breaker.reset();
    logger.info(`[${this.connectorName}] Circuit breaker reset`);
  }
}

/**
 * Example: Enhanced RealEstate Connector with Circuit Breaker
 */
@Injectable()
export class ResilientRealEstateConnector extends ResilientConnectorBase {
  constructor() {
    super('realestate-au');
    
    // Initialize Axios client with timeout
    this.client = axios.create({
      timeout: 30000,
      baseURL: 'https://api.realestate.com.au',
    });
  }

  async searchProperties(query: string, limit = 20) {
    const url = `/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.makeRequest(url);
  }

  async getProperty(id: string) {
    const url = `/properties/${id}`;
    return this.makeRequest(url);
  }

  async getPriceTrend(propertyId: string) {
    const url = `/properties/${propertyId}/price-trend`;
    return this.makeRequest(url);
  }

  protected getFallbackData() {
    return {
      results: [],
      message: 'RealEstate connector unavailable - circuit breaker open',
    };
  }
}

/**
 * Example: Enhanced Domain Connector with Circuit Breaker
 */
@Injectable()
export class ResilientDomainConnector extends ResilientConnectorBase {
  constructor() {
    super('domain-au');
    
    this.client = axios.create({
      timeout: 30000,
      baseURL: 'https://api.domain.com.au',
    });
  }

  async searchProperties(location: string, limit = 20) {
    const url = `/search?location=${encodeURIComponent(location)}&limit=${limit}`;
    return this.makeRequest(url);
  }

  async getProperty(id: string) {
    const url = `/properties/${id}`;
    return this.makeRequest(url);
  }

  protected getFallbackData() {
    return {
      results: [],
      message: 'Domain connector unavailable - circuit breaker open',
    };
  }
}

/**
 * Connector Registry with Circuit Breaker Management
 */
@Injectable()
export class ResilientConnectorRegistry {
  private connectors: Map<string, ResilientConnectorBase> = new Map();

  constructor(
    private realEstateConnector: ResilientRealEstateConnector,
    private domainConnector: ResilientDomainConnector,
  ) {
    this.connectors.set('realestate-au', realEstateConnector);
    this.connectors.set('domain-au', domainConnector);
  }

  /**
   * Get connector by name
   */
  getConnector(name: string): ResilientConnectorBase | null {
    return this.connectors.get(name) || null;
  }

  /**
   * Get all connector metrics
   */
  getMetrics() {
    const metrics: Record<string, any> = {};
    for (const [name, connector] of this.connectors) {
      metrics[name] = connector.getMetrics();
    }
    return metrics;
  }

  /**
   * Get health status of all connectors
   */
  getHealthStatus() {
    const status: Record<string, any> = {};
    for (const [name, connector] of this.connectors) {
      const metrics = connector.getMetrics();
      status[name] = {
        available: metrics.isAvailable,
        state: metrics.state,
        failureCount: metrics.failureCount,
      };
    }
    return status;
  }

  /**
   * Reset all connectors
   */
  resetAll(): void {
    for (const connector of this.connectors.values()) {
      connector.resetCircuitBreaker();
    }
    logger.info('All connector circuit breakers reset');
  }

  /**
   * Reset specific connector
   */
  reset(name: string): boolean {
    const connector = this.connectors.get(name);
    if (connector) {
      connector.resetCircuitBreaker();
      return true;
    }
    return false;
  }
}
