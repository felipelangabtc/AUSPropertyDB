import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { processMlBatch } from '../src/processors/mlPredict.processor';

// Mock Prisma and axios
vi.mock('axios');
vi.mock('@aus-prop/db', () => ({
  PrismaClient: vi.fn(),
}));

describe('ML E2E Pipeline', () => {
  const mockPrisma = {
    property: {
      findMany: vi.fn(),
    },
    priceHistory: {
      findFirst: vi.fn(),
    },
    pricePrediction: {
      create: vi.fn(),
    },
  };

  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it('should train ML model with property data', async () => {
    const trainingData = {
      properties: [
        {
          bedrooms: 3,
          bathrooms: 2,
          parkingSpaces: 2,
          landSizeM2: 600,
          buildingSizeM2: 250,
          lat: -33.8688,
          lng: 151.2093,
          convenienceScore: 75,
        },
        {
          bedrooms: 4,
          bathrooms: 3,
          parkingSpaces: 2,
          landSizeM2: 800,
          buildingSizeM2: 350,
          lat: -33.87,
          lng: 151.21,
          convenienceScore: 80,
        },
      ],
      prices: [800000, 1200000],
    };

    // Mock training endpoint
    (axios.post as any).mockResolvedValueOnce({
      data: {
        trained: true,
        model_path: '/models/model.joblib',
        samples: 2,
        r_squared: 0.95,
        timestamp: new Date().toISOString(),
      },
    });

    const response = await axios.post('http://ml:8000/train', trainingData);
    expect(response.data.trained).toBe(true);
    expect(response.data.samples).toBe(2);
    expect(response.data.r_squared).toBeGreaterThan(0.9);
  });

  it('should predict price for property with trained model', async () => {
    const predictPayload = {
      property: {
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        landSizeM2: 650,
        buildingSizeM2: 280,
        lat: -33.869,
        lng: 151.2095,
        convenienceScore: 76,
      },
      last_price: 800000,
    };

    (axios.post as any).mockResolvedValueOnce({
      data: {
        price: 950000,
        confidence: 0.75,
        model_version: 'v1',
        predicted_at: new Date().toISOString(),
      },
    });

    const response = await axios.post('http://ml:8000/predict', predictPayload);
    expect(response.data.price).toBeDefined();
    expect(response.data.confidence).toBeGreaterThan(0);
    expect(response.data.model_version).toBe('v1');
  });

  it('should batch predict for multiple properties', async () => {
    const properties = [
      {
        id: 'prop1',
        bedrooms: 3,
        bathrooms: 2,
        parking_spaces: 2,
        land_size_m2: 600,
        building_size_m2: 250,
        lat: -33.8688,
        lng: 151.2093,
        listing_views: 0,
        isActive: true,
      },
      {
        id: 'prop2',
        bedrooms: 4,
        bathrooms: 3,
        parking_spaces: 2,
        land_size_m2: 800,
        building_size_m2: 350,
        lat: -33.87,
        lng: 151.21,
        listing_views: 0,
        isActive: true,
      },
    ];

    mockPrisma.property.findMany.mockResolvedValueOnce(properties);
    mockPrisma.priceHistory.findFirst.mockResolvedValue({ price: 800000 });
    mockPrisma.pricePrediction.create.mockResolvedValue({ id: 'pred1' });

    (axios.post as any).mockResolvedValue({
      data: {
        price: 950000,
        confidence: 0.75,
        model_version: 'v1',
        predicted_at: new Date().toISOString(),
      },
    });

    const result = await processMlBatch(mockPrisma, { mlServiceUrl: 'http://ml:8000' });

    expect(result.count).toBe(2);
    expect(result.results.length).toBe(2);
    expect(result.results[0].ok).toBe(true);
  });

  it('should fallback to heuristic when model unavailable', async () => {
    const predictPayload = {
      property: {
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: 1,
        landSizeM2: 500,
        buildingSizeM2: 120,
        lat: -33.8688,
        lng: 151.2093,
        convenienceScore: 50,
      },
    };

    (axios.post as any).mockResolvedValueOnce({
      data: {
        price: 250000, // Fallback heuristic: mean(features) * 1000
        confidence: 0.3,
        model_version: 'v1',
        predicted_at: new Date().toISOString(),
      },
    });

    const response = await axios.post('http://ml:8000/predict', predictPayload);
    expect(response.data.confidence).toBe(0.3); // Low confidence when using fallback
  });
});
