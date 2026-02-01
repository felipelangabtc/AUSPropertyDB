import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PropertyValuationService } from '../property-valuation.service';
import { MarketPredictionService } from '../market-prediction.service';
import { RecommendationEngineService } from '../recommendation-engine.service';
import { MLController } from '../ml.controller';

describe('ML Module', () => {
  let controller: MLController;
  let valuationService: PropertyValuationService;
  let marketPredictionService: MarketPredictionService;
  let recommendationService: RecommendationEngineService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => 'test-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MLController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        PropertyValuationService,
        MarketPredictionService,
        RecommendationEngineService,
      ],
    }).compile();

    controller = module.get<MLController>(MLController);
    valuationService = module.get<PropertyValuationService>(PropertyValuationService);
    marketPredictionService = module.get<MarketPredictionService>(MarketPredictionService);
    recommendationService = module.get<RecommendationEngineService>(RecommendationEngineService);
  });

  describe('PropertyValuationService', () => {
    it('should be defined', () => {
      expect(valuationService).toBeDefined();
    });

    it('should valuate a property', async () => {
      const input = {
        bedrooms: 3,
        bathrooms: 2,
        area: 250,
        location: 'Sydney Metro',
        age: 10,
        condition: 'good' as const,
        features: ['pool', 'garage'],
        propertyType: 'house' as const,
      };

      const result = await valuationService.predictValuation(input);

      expect(result).toBeDefined();
      expect(result.estimatedValue).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
      expect(result.valuationRange.low).toBeLessThan(result.estimatedValue);
      expect(result.valuationRange.high).toBeGreaterThan(result.estimatedValue);
      expect(result.factors).toBeDefined();
      expect(result.comparables).toBeDefined();
      expect(result.marketTrend).toMatch(/appreciating|stable|depreciating/);
    });

    it('should handle excellent condition properties', async () => {
      const input = {
        bedrooms: 4,
        bathrooms: 3,
        area: 350,
        location: 'Sydney CBD',
        age: 2,
        condition: 'excellent' as const,
        features: ['pool', 'garage', 'solar'],
        propertyType: 'house' as const,
      };

      const result = await valuationService.predictValuation(input);

      expect(result.estimatedValue).toBeGreaterThan(1000000); // Premium property
      expect(result.confidenceScore).toBeGreaterThan(0.8);
    });

    it('should handle apartments differently from houses', async () => {
      const houseInput = {
        bedrooms: 3,
        bathrooms: 2,
        area: 250,
        location: 'Sydney Metro',
        age: 10,
        condition: 'good' as const,
        features: [],
        propertyType: 'house' as const,
      };

      const apartmentInput = { ...houseInput, propertyType: 'apartment' as const };

      const houseResult = await valuationService.predictValuation(houseInput);
      const apartmentResult = await valuationService.predictValuation(apartmentInput);

      expect(houseResult.estimatedValue).toBeGreaterThan(apartmentResult.estimatedValue);
    });

    it('should batch valuate properties', async () => {
      const inputs = [
        {
          bedrooms: 3,
          bathrooms: 2,
          area: 250,
          location: 'Sydney Metro',
          age: 10,
          condition: 'good' as const,
          features: [],
          propertyType: 'house' as const,
        },
        {
          bedrooms: 2,
          bathrooms: 1,
          area: 120,
          location: 'Melbourne Metro',
          age: 5,
          condition: 'excellent' as const,
          features: ['balcony'],
          propertyType: 'apartment' as const,
        },
      ];

      const results = await valuationService.batchValuate(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].estimatedValue).toBeGreaterThan(0);
      expect(results[1].estimatedValue).toBeGreaterThan(0);
    });
  });

  describe('MarketPredictionService', () => {
    it('should be defined', () => {
      expect(marketPredictionService).toBeDefined();
    });

    it('should predict market trends', async () => {
      const input = {
        location: 'Sydney Metro',
        propertyType: 'house' as const,
        historicalData: [
          { date: new Date('2024-01-01'), avgPrice: 800000, salesVolume: 50, daysOnMarket: 30 },
          { date: new Date('2024-02-01'), avgPrice: 810000, salesVolume: 55, daysOnMarket: 28 },
          { date: new Date('2024-03-01'), avgPrice: 825000, salesVolume: 60, daysOnMarket: 25 },
          { date: new Date('2024-04-01'), avgPrice: 840000, salesVolume: 65, daysOnMarket: 23 },
        ],
      };

      const result = await marketPredictionService.predictMarketTrends(input);

      expect(result).toBeDefined();
      expect(result.currentAvgPrice).toBeGreaterThan(0);
      expect(result.predictedPrices).toBeDefined();
      expect(result.predictedPrices.month1).toBeGreaterThan(0);
      expect(result.predictedPrices.month12).toBeGreaterThan(0);
      expect(result.trend).toMatch(/uptrend|downtrend|stable/);
      expect(result.volatility).toMatch(/low|medium|high/);
      expect(result.demandLevel).toMatch(/very_low|low|medium|high|very_high/);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect uptrend in rising market', async () => {
      const input = {
        location: 'Sydney Metro',
        propertyType: 'house' as const,
        historicalData: Array(12)
          .fill(null)
          .map((_, i) => ({
            date: new Date(2024, i, 1),
            avgPrice: 800000 + i * 5000,
            salesVolume: 50 + i * 2,
            daysOnMarket: 30 - i,
          })),
      };

      const result = await marketPredictionService.predictMarketTrends(input);

      expect(result.trend).toContain('uptrend');
      expect(result.predictedPrices.month12).toBeGreaterThan(result.currentAvgPrice);
    });

    it('should compare multiple markets', async () => {
      const inputs = [
        {
          location: 'Sydney Metro',
          propertyType: 'house' as const,
          historicalData: [
            { date: new Date('2024-01-01'), avgPrice: 800000, salesVolume: 50, daysOnMarket: 30 },
            { date: new Date('2024-04-01'), avgPrice: 840000, salesVolume: 65, daysOnMarket: 23 },
          ],
        },
        {
          location: 'Melbourne Metro',
          propertyType: 'house' as const,
          historicalData: [
            { date: new Date('2024-01-01'), avgPrice: 700000, salesVolume: 40, daysOnMarket: 35 },
            { date: new Date('2024-04-01'), avgPrice: 700000, salesVolume: 40, daysOnMarket: 35 },
          ],
        },
      ];

      const results = await marketPredictionService.compareMarkets(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].location).toBe('Sydney Metro');
      expect(results[1].location).toBe('Melbourne Metro');
    });
  });

  describe('RecommendationEngineService', () => {
    it('should be defined', () => {
      expect(recommendationService).toBeDefined();
    });

    it('should generate recommendations', async () => {
      const userProfile = {
        userId: 'user-1',
        preferredLocations: ['Sydney Metro', 'Sydney Suburbs'],
        minBudget: 600000,
        maxBudget: 1000000,
        minBedrooms: 2,
        maxBedrooms: 4,
        propertyTypes: ['house', 'apartment'],
        viewedProperties: ['prop-1', 'prop-2'],
        savedProperties: [],
        contactedProperties: [],
        preferences: {
          pool: true,
          garage: true,
          garden: false,
          newlyRenovated: true,
        },
      };

      const properties = [
        {
          propertyId: 'prop-3',
          price: 800000,
          bedrooms: 3,
          location: 'Sydney Metro',
          type: 'house',
          features: ['pool', 'garage', 'renovated'],
          viewCount: 150,
          contactCount: 25,
          listDate: new Date('2025-01-20'),
        },
        {
          propertyId: 'prop-4',
          price: 2000000,
          bedrooms: 5,
          location: 'Sydney Metro',
          type: 'house',
          features: ['pool', 'garage'],
          viewCount: 80,
          contactCount: 10,
          listDate: new Date('2024-12-15'),
        },
      ];

      const recommendations = await recommendationService.getRecommendations(
        userProfile,
        properties,
        10
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].propertyId).toBeDefined();
      expect(recommendations[0].matchScore).toBeGreaterThanOrEqual(0);
      expect(recommendations[0].matchScore).toBeLessThanOrEqual(100);
      expect(recommendations[0].reasons).toBeDefined();
      expect(Array.isArray(recommendations[0].reasons)).toBe(true);
      expect(recommendations[0].priority).toMatch(/high|medium|low/);
    });

    it('should filter properties by budget', async () => {
      const userProfile = {
        userId: 'user-2',
        preferredLocations: [],
        minBudget: 600000,
        maxBudget: 800000,
        minBedrooms: 2,
        maxBedrooms: 4,
        propertyTypes: [],
        viewedProperties: [],
        savedProperties: [],
        contactedProperties: [],
        preferences: {
          pool: false,
          garage: false,
          garden: false,
          newlyRenovated: false,
        },
      };

      const properties = [
        {
          propertyId: 'affordable',
          price: 700000,
          bedrooms: 3,
          location: 'Sydney',
          type: 'house',
          features: [],
          viewCount: 50,
          contactCount: 5,
          listDate: new Date(),
        },
        {
          propertyId: 'expensive',
          price: 1500000,
          bedrooms: 4,
          location: 'Sydney',
          type: 'house',
          features: [],
          viewCount: 100,
          contactCount: 15,
          listDate: new Date(),
        },
      ];

      const recommendations = await recommendationService.getRecommendations(
        userProfile,
        properties,
        10
      );

      // Should only include the affordable property
      const propertyIds = recommendations.map((r) => r.propertyId);
      expect(propertyIds).toContain('affordable');
      expect(propertyIds).not.toContain('expensive');
    });

    it('should provide search suggestions', async () => {
      const userProfile = {
        userId: 'user-3',
        preferredLocations: ['Sydney Metro'],
        minBudget: 600000,
        maxBudget: 900000,
        minBedrooms: 2,
        maxBedrooms: 4,
        propertyTypes: ['house'],
        viewedProperties: [],
        savedProperties: [],
        contactedProperties: [],
        preferences: {
          pool: true,
          garage: true,
          garden: false,
          newlyRenovated: false,
        },
      };

      const suggestions = await recommendationService.getSearchSuggestions(userProfile);

      expect(suggestions).toBeDefined();
      expect(suggestions.suggestedLocations).toBeDefined();
      expect(suggestions.suggestedBudgetRange).toBeDefined();
      expect(suggestions.suggestedPropertyTypes).toBeDefined();
      expect(suggestions.searchTips).toBeDefined();
    });

    it('should prioritize trending properties', async () => {
      const userProfile = {
        userId: 'user-4',
        preferredLocations: [],
        minBudget: 500000,
        maxBudget: 1000000,
        minBedrooms: 1,
        maxBedrooms: 5,
        propertyTypes: [],
        viewedProperties: [],
        savedProperties: [],
        contactedProperties: [],
        preferences: {
          pool: false,
          garage: false,
          garden: false,
          newlyRenovated: false,
        },
      };

      const properties = [
        {
          propertyId: 'trending',
          price: 750000,
          bedrooms: 3,
          location: 'Sydney',
          type: 'house',
          features: [],
          viewCount: 200,
          contactCount: 30,
          listDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          propertyId: 'slow',
          price: 750000,
          bedrooms: 3,
          location: 'Sydney',
          type: 'house',
          features: [],
          viewCount: 20,
          contactCount: 2,
          listDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        },
      ];

      const recommendations = await recommendationService.getRecommendations(
        userProfile,
        properties,
        10
      );

      // Trending should rank higher
      expect(recommendations[0].propertyId).toBe('trending');
    });
  });

  describe('MLController', () => {
    const mockUser = { id: 'user-1', role: 'user' };

    it('should valuate property', async () => {
      const input = {
        bedrooms: 3,
        bathrooms: 2,
        area: 250,
        location: 'Sydney Metro',
        age: 10,
        condition: 'good' as const,
        features: [],
        propertyType: 'house' as const,
      };

      const result = await controller.valuateProperty(input);

      expect(result).toBeDefined();
      expect(result.estimatedValue).toBeGreaterThan(0);
    });

    it('should batch valuate', async () => {
      const inputs = [
        {
          bedrooms: 3,
          bathrooms: 2,
          area: 250,
          location: 'Sydney Metro',
          age: 10,
          condition: 'good' as const,
          features: [],
          propertyType: 'house' as const,
        },
      ];

      const results = await controller.batchValuate(inputs);

      expect(results).toHaveLength(1);
    });

    it('should predict market trends', async () => {
      const input = {
        location: 'Sydney Metro',
        propertyType: 'house' as const,
        historicalData: [
          { date: new Date('2024-01-01'), avgPrice: 800000, salesVolume: 50, daysOnMarket: 30 },
          { date: new Date('2024-04-01'), avgPrice: 840000, salesVolume: 65, daysOnMarket: 23 },
        ],
      };

      const result = await controller.predictMarket(input);

      expect(result).toBeDefined();
      expect(result.predictedPrices).toBeDefined();
    });

    it('should perform health check', async () => {
      const health = await controller.healthCheck();

      expect(health.valuation).toBe(true);
      expect(health.marketPrediction).toBe(true);
      expect(health.recommendations).toBe(true);
    });
  });
});
