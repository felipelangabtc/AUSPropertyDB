import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processMlBatch } from '../src/processors/mlPredict.processor';

describe('ML batch processor', () => {
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      property: { findMany: vi.fn() },
      priceHistory: { findFirst: vi.fn() },
      pricePrediction: { create: vi.fn() },
    } as any;
    vi.resetAllMocks();
  });

  it('sends properties to ML service and saves predictions', async () => {
    // Mock one property
    const properties = [
      {
        id: 'prop1',
        bedrooms: 3,
        bathrooms: 2,
        property_type: 'house',
        land_size_m2: 500,
        building_size_m2: 120,
        suburb: 'Testville',
        postcode: '2000',
        lat: -33.0,
        lng: 151.0,
      },
    ];

    prismaMock.property.findMany.mockResolvedValue(properties);
    prismaMock.priceHistory.findFirst.mockResolvedValue({ price: 750000 });
    prismaMock.pricePrediction.create.mockResolvedValue({});

    // Mock axios post
    const axios = await vi.importActual('axios');
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { price: 760000, confidence: 0.85 } });

    const result = await processMlBatch(prismaMock as any, { mlServiceUrl: 'http://ml:8000' });

    expect(prismaMock.property.findMany).toHaveBeenCalled();
    expect(prismaMock.priceHistory.findFirst).toHaveBeenCalled();
    expect(prismaMock.pricePrediction.create).toHaveBeenCalled();
    expect(result.count).toBe(1);
    expect(result.results[0].ok).toBe(true);
  });

  it('handles prediction failures gracefully', async () => {
    const properties = [
      { id: 'p1', bedrooms: 2, bathrooms: 1, property_type: 'unit', suburb: 'X' },
    ];
    prismaMock.property.findMany.mockResolvedValue(properties);
    prismaMock.priceHistory.findFirst.mockResolvedValue(null);
    prismaMock.pricePrediction.create.mockResolvedValue({});

    const axios = await vi.importActual('axios');
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('timeout'));

    const result = await processMlBatch(prismaMock as any, { mlServiceUrl: 'http://ml:8000' });

    expect(result.count).toBe(1);
    expect(result.results[0].ok).toBe(false);
  });
});
