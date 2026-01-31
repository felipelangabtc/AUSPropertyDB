import {
  DiscoverOptions,
  DiscoveredListing,
  EnrichedListingData,
  NormalizedListing,
} from '@aus-prop/shared';
import { BaseSourceConnector } from '../base.connector';
import axios, { AxiosInstance } from 'axios';

/**
 * Domain.com.au Connector (skeleton)
 * Placeholder implementation that can be extended to use Domain's API or scraping
 */
export class DomainAUConnector extends BaseSourceConnector {
  name = 'domain.com.au';
  domain = 'domain.com.au';
  method: 'api' | 'scrape' | 'feed' | 'manual' = 'scrape';

  private client: AxiosInstance;
  private baseUrl = 'https://api.domain.com.au'; // placeholder

  constructor(apiKey?: string) {
    super();
    const key = apiKey || process.env.DOMAIN_API_KEY || '';
    if (key) this.method = 'api';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AUS-PropertyDB/1.0; +https://auspropdb.com)',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
    });
  }

  async discoverListings(options?: DiscoverOptions): Promise<DiscoveredListing[]> {
    this.logger.info('Discovering listings from Domain.com.au', options);

    if (this.method === 'api') {
      try {
        // Placeholder for actual API integration
        // const resp = await this.client.get('/listings', { params: { limit: 50 } });
        this.recordSuccess();
        return [];
      } catch (err) {
        this.recordFailure(`Discovery error: ${err}`);
        return [];
      }
    }

    // Fallback scraping / simulated discovery when API key not present
    const fallback: DiscoveredListing[] = [
      { sourceId: 'dom_demo_1', url: 'https://www.domain.com.au/property-demo-1', foundAt: new Date(), priority: 1 },
      { sourceId: 'dom_demo_2', url: 'https://www.domain.com.au/property-demo-2', foundAt: new Date(), priority: 1 },
    ];
    this.logDiscovery(fallback.length);
    this.recordSuccess();
    return fallback;
  }

  async fetchListingDetails(sourceId: string): Promise<EnrichedListingData> {
    this.incrementRequestCount();
    this.logger.debug(`Fetching listing details: ${sourceId}`);

    try {
      if (this.method === 'api') {
        // Placeholder for real API call
        // const resp = await this.client.get(`/listings/${sourceId}`);
        // map resp.data -> enriched
      }

      const enriched: EnrichedListingData = {
        sourceId,
        url: `https://www.domain.com.au/property-${sourceId}`,
        title: 'Domain Property Title',
        description: 'Description',
        address: '456 Example Rd, Melbourne VIC 3000',
        price: Math.floor(400000 + Math.random() * 1200000),
        priceDisplay: `$${Math.floor(400000 + Math.random() * 1200000).toLocaleString()}`,
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        landSizeM2: 350,
        buildingSizeM2: 150,
        yearBuilt: 2010,
        status: 'active',
        agentName: 'Domain Agent',
        agencyName: 'Domain Agency',
        listedAt: new Date().toISOString(),
        images: [],
        rawData: {},
      };

      this.logFetch(1);
      this.recordSuccess();
      return enriched;
    } catch (error) {
      this.recordFailure(`Fetch failed for ${sourceId}: ${error}`);
      throw error;
    }

    this.logFetch(1);
    this.recordSuccess();
    return enriched;
  }

  async normalize(rawData: unknown): Promise<NormalizedListing> {
    const listing = rawData as any;

    const normalized: NormalizedListing = {
      sourceListingId: listing.id || listing.sourceId,
      url: listing.url,
      source: this.name,
      title: listing.title,
      description: listing.description,
      canonical_address: listing.address,
      price_numeric_min: listing.price || null,
      price_numeric_max: listing.priceMax || listing.price || null,
      price_display: listing.priceDisplay,
      currency: 'AUD',
      property_type: listing.propertyType || listing.type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      parking_spaces: listing.parkingSpaces,
      land_size_m2: listing.landSizeM2,
      building_size_m2: listing.buildingSizeM2,
      status: listing.status || 'active',
      agent_name: listing.agentName,
      agency_name: listing.agencyName,
      listed_at: listing.listedAt ? new Date(listing.listedAt) : new Date(),
    };

    const validated = await this.validateNormalizedListing(normalized);
    this.logNormalization(1);
    return validated;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Quick check could be implemented here
      this.recordSuccess();
      return true;
    } catch (error) {
      this.recordFailure(`Health check failed: ${error}`);
      return false;
    }
  }
}
