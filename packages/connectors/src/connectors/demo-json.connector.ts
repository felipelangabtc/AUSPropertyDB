import {
  DiscoverOptions,
  DiscoveredListing,
  EnrichedListingData,
  NormalizedListing,
} from '@aus-prop/shared';
import { BaseSourceConnector } from '../base.connector';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Demo Connector - reads from a static JSON file
 * Perfect for testing without external dependencies
 */
export class DemoJSONConnector extends BaseSourceConnector {
  name = 'demo-json';
  domain = 'demo.local';
  method: 'api' | 'scrape' | 'feed' | 'manual' = 'feed';

  private listings: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    // Try to load demo data from file
    try {
      const demoDataPath = path.join(__dirname, '../../../fixtures/demo-listings.json');
      if (fs.existsSync(demoDataPath)) {
        const data = JSON.parse(fs.readFileSync(demoDataPath, 'utf-8'));
        data.forEach((listing: any) => {
          this.listings.set(listing.id, listing);
        });
        this.logger.info(`Loaded ${this.listings.size} demo listings`);
      }
    } catch (error) {
      this.logger.warn('Could not load demo data file', error);
      this.loadBuiltInDemoData();
    }
  }

  async discoverListings(options?: DiscoverOptions): Promise<DiscoveredListing[]> {
    this.logger.info('Discovering listings from demo data');

    if (this.listings.size === 0) {
      await this.initialize();
    }

    const discoveries: DiscoveredListing[] = [];

    for (const [id, listing] of this.listings) {
      discoveries.push({
        sourceId: id,
        url: listing.url || `https://demo.local/listing/${id}`,
        foundAt: new Date(),
        priority: 1,
      });
    }

    this.logDiscovery(discoveries.length);
    this.recordSuccess();
    return discoveries;
  }

  async fetchListingDetails(sourceId: string): Promise<EnrichedListingData> {
    this.incrementRequestCount();

    const listing = this.listings.get(sourceId);
    if (!listing) {
      throw new Error(`Listing not found: ${sourceId}`);
    }

    const enriched: EnrichedListingData = {
      sourceId,
      url: listing.url,
      title: listing.title,
      description: listing.description,
      address: listing.address,
      price: listing.price,
      priceDisplay: listing.priceDisplay,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      parkingSpaces: listing.parkingSpaces,
      landSizeM2: listing.landSizeM2,
      buildingSizeM2: listing.buildingSizeM2,
      yearBuilt: listing.yearBuilt,
      status: listing.status,
      agentName: listing.agentName,
      agencyName: listing.agencyName,
      rawData: listing,
    };

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
      price_numeric_min: listing.price || listing.priceMin,
      price_numeric_max: listing.priceMax || listing.price,
      price_display: listing.priceDisplay,
      currency: 'AUD',
      property_type: listing.propertyType || listing.type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      parking_spaces: listing.parkingSpaces,
      land_size_m2: listing.landSizeM2,
      building_size_m2: listing.buildingSizeM2,
      year_built: listing.yearBuilt,
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
      if (this.listings.size === 0) {
        await this.initialize();
      }
      return this.listings.size > 0;
    } catch (error) {
      this.recordFailure(`Health check failed: ${error}`);
      return false;
    }
  }

  private loadBuiltInDemoData(): void {
    // Built-in demo data for testing
    const demoData = [
      {
        id: 'demo-001',
        sourceId: 'rea_123456',
        url: 'https://realestate.com.au/property-apartment-nsw-sydney-123456',
        title: 'Modern 2BR Apartment in CBD',
        description: 'Beautiful apartment with harbour views in the heart of Sydney CBD',
        address: '123 Pitt Street, Sydney NSW 2000',
        price: 775000,
        priceDisplay: '$775,000',
        priceMin: 750000,
        priceMax: 800000,
        bedrooms: 2,
        bathrooms: 2,
        parkingSpaces: 1,
        buildingSizeM2: 85,
        status: 'active',
        agentName: 'John Smith',
        agencyName: 'Sydney Real Estate',
        listedAt: '2024-01-15',
      },
      {
        id: 'demo-002',
        sourceId: 'rea_789012',
        url: 'https://realestate.com.au/property-house-nsw-paddington-789012',
        title: 'Charming Victorian in Paddington',
        description: 'Renovated 3 bedroom Victorian terrace in inner west',
        address: '456 Oxford Street, Paddington NSW 2021',
        price: 2150000,
        priceDisplay: '$2,150,000',
        priceMin: 2100000,
        priceMax: 2200000,
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        landSizeM2: 450,
        buildingSizeM2: 180,
        yearBuilt: 1920,
        status: 'active',
        agentName: 'Sarah Johnson',
        agencyName: 'Domain Estate Agents',
        listedAt: '2024-01-10',
      },
      {
        id: 'demo-003',
        sourceId: 'rea_345678',
        url: 'https://realestate.com.au/property-apartment-nsw-bondi-345678',
        title: 'Beachside Studio in Bondi',
        description: 'Studio apartment walking distance to Bondi Beach',
        address: '789 Bondi Road, Bondi NSW 2026',
        price: 675000,
        priceDisplay: '$675,000',
        priceMin: 650000,
        priceMax: 700000,
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 0,
        buildingSizeM2: 50,
        status: 'under_offer',
        agentName: 'Michael Lee',
        agencyName: 'Bondi Beach Properties',
        listedAt: '2024-01-20',
      },
    ];

    demoData.forEach((listing) => {
      this.listings.set(listing.id, listing);
    });

    this.logger.info('Loaded built-in demo data');
  }
}
