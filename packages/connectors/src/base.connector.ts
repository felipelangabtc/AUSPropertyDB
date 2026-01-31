import {
  ISourceConnector,
  DiscoverOptions,
  DiscoveredListing,
  EnrichedListingData,
  NormalizedListing,
  RateLimitInfo,
  ConnectorMetrics,
  NormalizedListingSchema,
} from '@aus-prop/shared';
import winston from 'winston';

/**
 * Base class for all source connectors
 * Provides common functionality and enforces interface contract
 */
export abstract class BaseSourceConnector implements ISourceConnector {
  abstract name: string;
  abstract domain: string;
  abstract method: 'api' | 'scrape' | 'feed' | 'manual';

  protected logger: winston.Logger;
  protected requestCount = 0;
  protected lastResetTime = Date.now();
  protected rateLimitRequests = 3600; // Default: 3600 requests/hour
  protected listingsDiscovered = 0;
  protected listingsFetched = 0;
  protected listingsNormalized = 0;
  protected failureCount = 0;
  protected lastSuccessfulFetch: Date | null = null;
  protected lastError: string | null = null;

  constructor() {
    this.logger = winston.createLogger({
      defaultMeta: { service: `connector-${this.name}` },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  abstract discoverListings(options?: DiscoverOptions): Promise<DiscoveredListing[]>;

  abstract fetchListingDetails(sourceId: string): Promise<EnrichedListingData>;

  abstract normalize(rawData: unknown): Promise<NormalizedListing>;

  abstract healthCheck(): Promise<boolean>;

  getRateLimitInfo(): RateLimitInfo {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const secondsInHour = 3600000;

    // Reset counter after 1 hour
    if (timeSinceReset > secondsInHour) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return {
      requestsPerHour: this.rateLimitRequests,
      requestsRemaining: Math.max(0, this.rateLimitRequests - this.requestCount),
      resetAt: new Date(this.lastResetTime + secondsInHour),
    };
  }

  getMetrics(): ConnectorMetrics {
    const totalRequests = this.listingsDiscovered + this.listingsFetched;
    const failureRate = totalRequests === 0 ? 0 : (this.failureCount / totalRequests) * 100;

    return {
      name: this.name,
      health: this.getHealth(),
      lastSuccessfulFetch: this.lastSuccessfulFetch || undefined,
      lastError: this.lastError || undefined,
      listingsDiscovered: this.listingsDiscovered,
      listingsFetched: this.listingsFetched,
      listingsNormalized: this.listingsNormalized,
      failureRate,
    };
  }

  protected getHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    if (!this.lastSuccessfulFetch) {
      return 'unhealthy';
    }

    const hoursSinceFetch = (Date.now() - this.lastSuccessfulFetch.getTime()) / (1000 * 60 * 60);

    if (hoursSinceFetch > 24) {
      return 'unhealthy';
    }

    if (hoursSinceFetch > 6) {
      return 'degraded';
    }

    return 'healthy';
  }

  protected async validateNormalizedListing(
    listing: NormalizedListing
  ): Promise<NormalizedListing> {
    try {
      return NormalizedListingSchema.parse(listing);
    } catch (error) {
      this.logger.error('Normalized listing validation failed:', error);
      throw error;
    }
  }

  protected incrementRequestCount(): void {
    this.requestCount++;
  }

  protected recordSuccess(): void {
    this.lastSuccessfulFetch = new Date();
  }

  protected recordFailure(error: string): void {
    this.failureCount++;
    this.lastError = error;
    this.logger.error('Connector failure:', error);
  }

  protected logDiscovery(count: number): void {
    this.listingsDiscovered += count;
    this.logger.info(`Discovered ${count} listings (total: ${this.listingsDiscovered})`);
  }

  protected logFetch(count: number): void {
    this.listingsFetched += count;
    this.logger.info(`Fetched ${count} listings (total: ${this.listingsFetched})`);
  }

  protected logNormalization(count: number): void {
    this.listingsNormalized += count;
    this.logger.info(`Normalized ${count} listings (total: ${this.listingsNormalized})`);
  }
}
