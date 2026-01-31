import { describe, it, expect } from 'vitest';
import { getConnector } from '../src';

describe('RealEstateAUConnector integration (fallback)', () => {
  it('discovers fallback listings and fetches details', async () => {
    const connector = getConnector('realestate.com.au');
    expect(connector).not.toBeNull();

    const discoveries = await connector!.discoverListings();
    expect(Array.isArray(discoveries)).toBe(true);
    expect(discoveries.length).toBeGreaterThanOrEqual(1);

    const first = discoveries[0];
    const details = await connector!.fetchListingDetails(first.sourceId || first.sourceId);
    expect(details).toHaveProperty('sourceId');
    expect(details).toHaveProperty('price');
    expect(details).toHaveProperty('address');
  }, 10000);
});
