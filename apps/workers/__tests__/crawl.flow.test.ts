import { describe, it, expect } from 'vitest';
import { getConnector } from '@aus-prop/connectors';

describe('Crawl flow (integration smoke)', () => {
  it('discovers and fetches details for demo connector', async () => {
    const connector = getConnector('demo-json');
    expect(connector).not.toBeNull();

    const discoveries = await connector!.discoverListings();
    expect(Array.isArray(discoveries)).toBe(true);
    expect(discoveries.length).toBeGreaterThan(0);

    const first = discoveries[0];
    const details = await connector!.fetchListingDetails(first.sourceId || (first as any).sourceId);
    expect(details).toHaveProperty('sourceId');
    expect(details).toHaveProperty('url');
  });
});
