// Connector interface types

import { z } from 'zod';

export interface ISourceConnector {
  name: string;
  domain: string;
  method: 'api' | 'scrape' | 'feed' | 'manual';

  /**
   * Discover listings from the source
   * Can do pagination, search, sitemap parsing, etc.
   */
  discoverListings(options?: DiscoverOptions): Promise<DiscoveredListing[]>;

  /**
   * Fetch full details of a specific listing
   */
  fetchListingDetails(sourceId: string): Promise<EnrichedListingData>;

  /**
   * Normalize raw listing data to standard schema
   */
  normalize(rawData: unknown): Promise<NormalizedListing>;

  /**
   * Health check for connector
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): RateLimitInfo;
}

export interface DiscoverOptions {
  forceRefresh?: boolean;
  fromDate?: Date;
  toDate?: Date;
  maxResults?: number;
  filters?: Record<string, unknown>;
}

export interface DiscoveredListing {
  sourceId: string;
  url: string;
  foundAt: Date;
  priority?: number;
}

export interface EnrichedListingData {
  sourceId: string;
  url: string;
  title?: string;
  description?: string;
  address?: string;
  price?: number;
  priceDisplay?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  landSizeM2?: number;
  buildingSizeM2?: number;
  yearBuilt?: number;
  status?: string;
  agentName?: string;
  agencyName?: string;
  imageUrls?: string[];
  rawData: unknown;
}

export interface NormalizedListing {
  sourceListingId: string;
  url: string;
  source: string;
  title?: string;
  description?: string;
  canonical_address?: string;
  price_numeric_min?: number;
  price_numeric_max?: number;
  price_display?: string;
  currency?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  land_size_m2?: number;
  building_size_m2?: number;
  year_built?: number;
  status?: string;
  agent_name?: string;
  agency_name?: string;
  listed_at?: Date;
}

export interface RateLimitInfo {
  requestsPerHour: number;
  requestsRemaining: number;
  resetAt: Date;
}

export interface ConnectorMetrics {
  name: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastSuccessfulFetch?: Date;
  lastError?: string;
  listingsDiscovered: number;
  listingsFetched: number;
  listingsNormalized: number;
  failureRate: number;
}

// Validation schemas

export const NormalizedListingSchema = z.object({
  sourceListingId: z.string(),
  url: z.string().url(),
  source: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  canonical_address: z.string().optional(),
  price_numeric_min: z.number().int().positive().optional(),
  price_numeric_max: z.number().int().positive().optional(),
  price_display: z.string().optional(),
  currency: z.string().default('AUD'),
  property_type: z.string().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parking_spaces: z.number().int().min(0).optional(),
  land_size_m2: z.number().positive().optional(),
  building_size_m2: z.number().positive().optional(),
  year_built: z.number().int().optional(),
  status: z.string().optional(),
  agent_name: z.string().optional(),
  agency_name: z.string().optional(),
  listed_at: z.date().optional(),
});

export type ValidatedNormalizedListing = z.infer<typeof NormalizedListingSchema>;
