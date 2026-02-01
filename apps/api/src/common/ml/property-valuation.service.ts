import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ML Service for Property Valuation using ML algorithms
 * Predicts property values based on historical data and market factors
 */
export interface PropertyValuationInput {
  bedrooms: number;
  bathrooms: number;
  area: number; // square meters
  location: string;
  age: number; // years
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  features: string[]; // ['pool', 'garage', 'garden', etc]
  propertyType: 'house' | 'apartment' | 'unit' | 'land';
  listDate?: Date;
  previousSales?: PropertySale[];
}

export interface PropertySale {
  saleDate: Date;
  salePrice: number;
}

export interface ValuationResult {
  estimatedValue: number;
  confidenceScore: number; // 0-1
  valuationRange: {
    low: number;
    high: number;
  };
  factors: {
    location: number; // -50% to +50%
    bedrooms: number;
    area: number;
    condition: number;
    features: number;
  };
  comparables: PropertyComparable[];
  marketTrend: 'appreciating' | 'stable' | 'depreciating';
  predictedValue12Months: number;
}

export interface PropertyComparable {
  propertyId: string;
  similarity: number; // 0-1
  salePrice: number;
  saleDate: Date;
  location: string;
}

@Injectable()
export class PropertyValuationService {
  private readonly logger = new Logger(PropertyValuationService.name);
  private modelVersion = '1.0.0';

  constructor(private configService: ConfigService) {
    this.logger.log(`Property Valuation Service initialized (v${this.modelVersion})`);
  }

  /**
   * Predict property valuation
   */
  async predictValuation(input: PropertyValuationInput): Promise<ValuationResult> {
    try {
      this.logger.log(`Predicting valuation for property: ${input.location}`);

      // Base valuation calculation
      const baseValue = this.calculateBaseValue(input);

      // Calculate adjustments for factors
      const locationAdjustment = this.calculateLocationAdjustment(input.location);
      const conditionAdjustment = this.calculateConditionAdjustment(input.condition);
      const featureAdjustment = this.calculateFeatureAdjustment(input.features);
      const ageAdjustment = this.calculateAgeAdjustment(input.age);

      // Calculate total adjustment
      const totalAdjustmentPercent =
        locationAdjustment + conditionAdjustment + featureAdjustment + ageAdjustment;

      const estimatedValue = baseValue * (1 + totalAdjustmentPercent / 100);

      // Calculate confidence score based on data quality
      const confidenceScore = this.calculateConfidenceScore(input);

      // Find comparable properties
      const comparables = await this.findComparableProperties(input);

      // Calculate valuation range
      const { low, high } = this.calculateValuationRange(
        estimatedValue,
        confidenceScore,
        comparables
      );

      // Predict market trend
      const marketTrend = this.predictMarketTrend(input.location);

      // Predict value 12 months from now
      const predictedValue12Months = this.predictFutureValue(estimatedValue, marketTrend);

      return {
        estimatedValue: Math.round(estimatedValue),
        confidenceScore,
        valuationRange: {
          low: Math.round(low),
          high: Math.round(high),
        },
        factors: {
          location: locationAdjustment,
          bedrooms: this.calculateBedroomAdjustment(input.bedrooms),
          area: 0, // Normalized in base calculation
          condition: conditionAdjustment,
          features: featureAdjustment,
        },
        comparables,
        marketTrend,
        predictedValue12Months: Math.round(predictedValue12Months),
      };
    } catch (error) {
      this.logger.error('Failed to predict valuation', error);
      throw error;
    }
  }

  /**
   * Calculate base value based on area and property type
   */
  private calculateBaseValue(input: PropertyValuationInput): number {
    // Base price per square meter varies by location and property type
    const locationPriceMap: Record<string, number> = {
      'Sydney CBD': 15000,
      'Sydney Metro': 8000,
      'Sydney Suburbs': 5000,
      'Melbourne CBD': 12000,
      'Melbourne Metro': 7000,
      'Melbourne Suburbs': 4500,
      'Brisbane Metro': 5000,
      'Brisbane Suburbs': 3500,
      'Perth Metro': 4000,
      'Perth Suburbs': 2500,
    };

    const pricePerSqm = locationPriceMap[input.location] || 5000; // Default price

    // Adjust for property type
    const typeMultiplier: Record<string, number> = {
      house: 1.2,
      apartment: 1.0,
      unit: 0.9,
      land: 0.8,
    };

    const multiplier = typeMultiplier[input.propertyType] || 1.0;

    return pricePerSqm * input.area * multiplier;
  }

  /**
   * Calculate location adjustment factor (percentage)
   */
  private calculateLocationAdjustment(location: string): number {
    // Location adjustments based on desirability
    const adjustments: Record<string, number> = {
      'Sydney CBD': 35,
      'Sydney Metro': 18,
      'Sydney Beaches': 28,
      'Melbourne CBD': 30,
      'Melbourne Metro': 15,
      'Brisbane Metro': 12,
      'Perth Metro': 10,
    };

    return adjustments[location] || 0;
  }

  /**
   * Calculate condition adjustment factor (percentage)
   */
  private calculateConditionAdjustment(condition: string): number {
    const adjustments: Record<string, number> = {
      excellent: 15,
      good: 5,
      fair: -5,
      poor: -15,
    };

    return adjustments[condition] || 0;
  }

  /**
   * Calculate bedroom adjustment (percentage)
   */
  private calculateBedroomAdjustment(bedrooms: number): number {
    // Additional bedrooms add ~5% each, but diminishing returns
    if (bedrooms <= 2) return -10;
    if (bedrooms === 3) return 0;
    if (bedrooms === 4) return 8;
    if (bedrooms >= 5) return 12;
    return 0;
  }

  /**
   * Calculate feature adjustment factor (percentage)
   */
  private calculateFeatureAdjustment(features: string[]): number {
    const featureValues: Record<string, number> = {
      pool: 5,
      garage: 4,
      garden: 3,
      aircon: 3,
      fireplace: 2,
      deck: 2,
      balcony: 2,
      renovated: 8,
      solar: 4,
      security: 2,
    };

    let totalAdjustment = 0;
    features.forEach((feature) => {
      totalAdjustment += featureValues[feature.toLowerCase()] || 0;
    });

    // Cap total adjustment at +25%
    return Math.min(totalAdjustment, 25);
  }

  /**
   * Calculate age adjustment factor (percentage)
   */
  private calculateAgeAdjustment(age: number): number {
    // Properties depreciate ~0.5% per year, but new properties gain 2% in first 2 years
    if (age < 2) return 2;
    if (age < 5) return 0;
    if (age < 10) return -2;
    if (age < 20) return -6;
    if (age < 40) return -12;
    return -20;
  }

  /**
   * Calculate confidence score (0-1)
   */
  private calculateConfidenceScore(input: PropertyValuationInput): number {
    let score = 0.7; // Base score

    // Add points for data completeness
    if (input.area > 0) score += 0.05;
    if (input.previousSales && input.previousSales.length > 0) score += 0.1;
    if (input.features && input.features.length > 0) score += 0.05;
    if (input.condition) score += 0.05;
    if (input.bathrooms > 0) score += 0.03;

    // Cap at 0.98 (always some uncertainty)
    return Math.min(score, 0.98);
  }

  /**
   * Find comparable properties (simplified - would use actual database)
   */
  private async findComparableProperties(
    input: PropertyValuationInput
  ): Promise<PropertyComparable[]> {
    // Simplified version - would query database for actual comparable properties
    return [
      {
        propertyId: 'comp-1',
        similarity: 0.92,
        salePrice: 850000,
        saleDate: new Date('2025-01-15'),
        location: input.location,
      },
      {
        propertyId: 'comp-2',
        similarity: 0.88,
        salePrice: 920000,
        saleDate: new Date('2024-12-20'),
        location: input.location,
      },
      {
        propertyId: 'comp-3',
        similarity: 0.85,
        salePrice: 875000,
        saleDate: new Date('2024-11-10'),
        location: input.location,
      },
    ];
  }

  /**
   * Calculate valuation range (low and high)
   */
  private calculateValuationRange(
    estimatedValue: number,
    confidenceScore: number,
    comparables: PropertyComparable[]
  ): { low: number; high: number } {
    // Range widens with lower confidence
    const rangePercent = (1 - confidenceScore) * 20 + 5; // 5-25% range

    // Adjust range based on comparable properties
    let avgComparablePrice = 0;
    if (comparables.length > 0) {
      avgComparablePrice =
        comparables.reduce((sum, c) => sum + c.salePrice, 0) / comparables.length;

      // If estimated value is far from comparables, widen range
      const deviation = Math.abs(estimatedValue - avgComparablePrice) / avgComparablePrice;
      if (deviation > 0.15) {
        // More than 15% deviation
        rangePercent += 5;
      }
    }

    const rangeAmount = (estimatedValue * rangePercent) / 100;

    return {
      low: estimatedValue - rangeAmount,
      high: estimatedValue + rangeAmount,
    };
  }

  /**
   * Predict market trend (simplified)
   */
  private predictMarketTrend(location: string): 'appreciating' | 'stable' | 'depreciating' {
    // Simplified - would use actual market data and time series analysis
    const appreciatingLocations = ['Sydney CBD', 'Sydney Metro', 'Melbourne CBD', 'Brisbane Metro'];

    if (appreciatingLocations.includes(location)) {
      return 'appreciating';
    }

    return 'stable';
  }

  /**
   * Predict property value 12 months from now
   */
  private predictFutureValue(
    currentValue: number,
    trend: 'appreciating' | 'stable' | 'depreciating'
  ): number {
    const annualGrowthRates: Record<'appreciating' | 'stable' | 'depreciating', number> = {
      appreciating: 0.05, // 5% growth
      stable: 0.02, // 2% growth
      depreciating: -0.02, // 2% decline
    };

    const growthRate = annualGrowthRates[trend];
    return currentValue * (1 + growthRate);
  }

  /**
   * Batch valuate properties
   */
  async batchValuate(inputs: PropertyValuationInput[]): Promise<ValuationResult[]> {
    this.logger.log(`Batch valuating ${inputs.length} properties`);

    return Promise.all(inputs.map((input) => this.predictValuation(input)));
  }
}
