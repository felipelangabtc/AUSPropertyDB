import { describe, it, expect } from 'vitest';
import { getConnector, listAvailableConnectors } from '../src';

describe('connectors registry', () => {
  it('lists connectors', () => {
    const list = listAvailableConnectors();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('instantiates demo connector', () => {
    const c = getConnector('demo-json');
    expect(c).not.toBeNull();
    expect(typeof (c as any).discoverListings).toBe('function');
  });

  it('instantiates domain connector', () => {
    const c = getConnector('domain.com.au');
    expect(c).not.toBeNull();
    expect(typeof (c as any).discoverListings).toBe('function');
  });
});
