import { Injectable, Logger } from '@nestjs/common';

/**
 * ML Service for Market Prediction
 * Predicts real estate market trends using time series analysis
 */
export interface MarketPredictionInput {
  location: string;
  propertyType: 'house' | 'apartment' | 'unit' | 'land';
  historicalData: {
    date: Date;
    avgPrice: number;
    salesVolume: number;
    daysOnMarket: number;
  }[];
}

export interface MarketPrediction {
  location: string;
  propertyType: string;
  currentAvgPrice: number;
  predictedPrices: {
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  };
  trend: 'strong_uptrend' | 'uptrend' | 'stable' | 'downtrend' | 'strong_downtrend';
  volatility: 'low' | 'medium' | 'high';
  growthRate: {
    monthly: number; // percentage
    quarterly: number;
    yearly: number;
  };
  demandLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  buyingPressure: number; // -1 to +1
  seasonalFactors: {
    Q1: number; // percentage adjustment
    Q2: number;
    Q3: number;
    Q4: number;
  };
  riskScore: number; // 0-100, higher = riskier
  confidence: number; // 0-1
}

@Injectable()
export class MarketPredictionService {
  private readonly logger = new Logger(MarketPredictionService.name);

  /**
   * Predict market trends using time series analysis
   */
  async predictMarketTrends(input: MarketPredictionInput): Promise<MarketPrediction> {
    try {
      this.logger.log(`Predicting market trends for ${input.location}`);

      // Calculate statistics from historical data
      const stats = this.calculateStatistics(input.historicalData);

      // Identify trend using linear regression
      const trendAnalysis = this.analyzeTrend(input.historicalData);

      // Predict future prices
      const predictions = this.predictFuturePrices(
        stats.currentAvgPrice,
        trendAnalysis.slope,
        input.historicalData.length
      );

      // Analyze volatility
      const volatility = this.analyzeVolatility(stats.priceStdDev, stats.currentAvgPrice);

      // Calculate growth rates
      const growthRates = this.calculateGrowthRates(input.historicalData);

      // Analyze demand
      const demandAnalysis = this.analyzeDemand(input.historicalData);

      // Calculate buying pressure
      const buyingPressure = this.calculateBuyingPressure(
        demandAnalysis.salesVolumeTrend,
        trendAnalysis.slope,
        stats.daysOnMarketTrend
      );

      // Seasonal factors
      const seasonalFactors = this.calculateSeasonalFactors(input.historicalData);

      // Risk score
      const riskScore = this.calculateRiskScore(
        volatility,
        trendAnalysis.trend,
        demandAnalysis.demandLevel
      );

      return {
        location: input.location,
        propertyType: input.propertyType,
        currentAvgPrice: Math.round(stats.currentAvgPrice),
        predictedPrices: {
          month1: Math.round(predictions.month1),
          month3: Math.round(predictions.month3),
          month6: Math.round(predictions.month6),
          month12: Math.round(predictions.month12),
        },
        trend: trendAnalysis.trend,
        volatility,
        growthRate: {
          monthly: Math.round(growthRates.monthly * 100) / 100,
          quarterly: Math.round(growthRates.quarterly * 100) / 100,
          yearly: Math.round(growthRates.yearly * 100) / 100,
        },
        demandLevel: demandAnalysis.demandLevel,
        buyingPressure,
        seasonalFactors,
        riskScore,
        confidence: this.calculateConfidence(
          input.historicalData.length,
          stats.priceStdDev,
          stats.currentAvgPrice
        ),
      };
    } catch (error) {
      this.logger.error('Failed to predict market trends', error);
      throw error;
    }
  }

  /**
   * Calculate statistics from historical data
   */
  private calculateStatistics(data: MarketPredictionInput['historicalData']): any {
    const prices = data.map((d) => d.avgPrice);
    const volumes = data.map((d) => d.salesVolume);
    const daysOnMarkets = data.map((d) => d.daysOnMarket);

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    const volumeAvg = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeTrend = (volumes[volumes.length - 1] - volumes[0]) / volumes[0];

    const daysAvg = daysOnMarkets.reduce((a, b) => a + b, 0) / daysOnMarkets.length;
    const daysTrend =
      (daysOnMarkets[daysOnMarkets.length - 1] - daysOnMarkets[0]) / daysOnMarkets[0];

    return {
      currentAvgPrice: prices[prices.length - 1],
      avgPrice: avg,
      priceStdDev: stdDev,
      coefficient: stdDev / avg, // Coefficient of variation
      volumeAvg,
      volumeTrend,
      daysOnMarketTrend: daysTrend,
    };
  }

  /**
   * Analyze trend using linear regression
   */
  private analyzeTrend(data: MarketPredictionInput['historicalData']): any {
    const prices = data.map((d) => d.avgPrice);
    const n = prices.length;

    // Linear regression: y = a + bx
    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = prices.reduce((a, b) => a + b, 0) / n;

    const slope =
      x.reduce((sum, xi, i) => sum + (xi - xMean) * (prices[i] - yMean), 0) /
      x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

    // Determine trend
    let trend: 'strong_uptrend' | 'uptrend' | 'stable' | 'downtrend' | 'strong_downtrend';
    const trendPercent = (slope / yMean) * 100;

    if (trendPercent > 0.5) trend = 'strong_uptrend';
    else if (trendPercent > 0.1) trend = 'uptrend';
    else if (trendPercent > -0.1) trend = 'stable';
    else if (trendPercent > -0.5) trend = 'downtrend';
    else trend = 'strong_downtrend';

    return { slope, trendPercent, trend };
  }

  /**
   * Predict future prices
   */
  private predictFuturePrices(
    currentPrice: number,
    slope: number,
    historyLength: number
  ): Record<string, number> {
    const monthlyChange = slope / 12; // Convert annual slope to monthly

    return {
      month1: currentPrice + monthlyChange * 1,
      month3: currentPrice + monthlyChange * 3,
      month6: currentPrice + monthlyChange * 6,
      month12: currentPrice + monthlyChange * 12,
    };
  }

  /**
   * Analyze volatility
   */
  private analyzeVolatility(stdDev: number, avgPrice: number): 'low' | 'medium' | 'high' {
    const coefficient = stdDev / avgPrice;

    if (coefficient < 0.05) return 'low';
    if (coefficient < 0.15) return 'medium';
    return 'high';
  }

  /**
   * Calculate growth rates
   */
  private calculateGrowthRates(
    data: MarketPredictionInput['historicalData']
  ): Record<string, number> {
    const prices = data.map((d) => d.avgPrice);

    // Monthly growth rate
    const monthlyGrowth =
      (prices[prices.length - 1] - prices[Math.max(0, prices.length - 1)]) /
      prices[Math.max(0, prices.length - 1)];

    // Calculate quarterly and yearly based on available data
    let quarterly = 0,
      yearly = 0;

    if (prices.length >= 3) {
      quarterly =
        (prices[prices.length - 1] - prices[prices.length - 3]) / prices[prices.length - 3];
    }

    if (prices.length >= 12) {
      yearly =
        (prices[prices.length - 1] - prices[prices.length - 12]) / prices[prices.length - 12];
    } else if (prices.length > 1) {
      yearly = monthlyGrowth * (12 / prices.length);
    }

    return { monthly: monthlyGrowth, quarterly, yearly };
  }

  /**
   * Analyze demand
   */
  private analyzeDemand(data: MarketPredictionInput['historicalData']): Record<string, any> {
    const volumes = data.map((d) => d.salesVolume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    const salesVolumeTrend = (currentVolume - volumes[0]) / volumes[0];

    let demandLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

    if (currentVolume < avgVolume * 0.5) demandLevel = 'very_low';
    else if (currentVolume < avgVolume * 0.8) demandLevel = 'low';
    else if (currentVolume < avgVolume * 1.2) demandLevel = 'medium';
    else if (currentVolume < avgVolume * 1.5) demandLevel = 'high';
    else demandLevel = 'very_high';

    return { demandLevel, salesVolumeTrend };
  }

  /**
   * Calculate buying pressure (-1 to +1)
   */
  private calculateBuyingPressure(
    salesVolumeTrend: number,
    priceTrend: number,
    daysOnMarketTrend: number
  ): number {
    // Positive pressure = buyers dominating
    // Negative pressure = sellers dominating

    const pressureFromVolume = Math.min(Math.max(salesVolumeTrend, -1), 1) * 0.5;
    const pressureFromPrice = Math.min(Math.max(priceTrend / 100, -1), 1) * 0.3;
    const pressureFromDays = -Math.min(Math.max(daysOnMarketTrend, -1), 1) * 0.2;

    return Math.round((pressureFromVolume + pressureFromPrice + pressureFromDays) * 100) / 100;
  }

  /**
   * Calculate seasonal factors
   */
  private calculateSeasonalFactors(
    data: MarketPredictionInput['historicalData']
  ): Record<string, number> {
    // Simplified seasonal adjustment (would use actual quarterly data)
    return {
      Q1: 0.98, // Typically slower
      Q2: 1.05, // Spring market active
      Q3: 1.02, // Still good
      Q4: 0.95, // Holiday season
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(
    volatility: 'low' | 'medium' | 'high',
    trend: string,
    demandLevel: string
  ): number {
    let score = 50; // Base score

    // Adjust for volatility
    if (volatility === 'low') score -= 15;
    else if (volatility === 'high') score += 20;

    // Adjust for trend
    if (trend.includes('downtrend')) score += 25;
    else if (trend.includes('uptrend')) score -= 15;

    // Adjust for demand
    if (demandLevel === 'very_low') score += 20;
    else if (demandLevel === 'very_high') score -= 10;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate confidence (0-1)
   */
  private calculateConfidence(dataPoints: number, stdDev: number, avgPrice: number): number {
    // More data points = higher confidence
    const dataConfidence = Math.min(dataPoints / 60, 0.6); // 60 months = max confidence

    // Lower volatility = higher confidence
    const coefficientOfVariation = stdDev / avgPrice;
    const volatilityConfidence = Math.max(0.4 - coefficientOfVariation, 0.1);

    return Math.round((dataConfidence + volatilityConfidence) * 100) / 100;
  }

  /**
   * Compare multiple markets
   */
  async compareMarkets(inputs: MarketPredictionInput[]): Promise<MarketPrediction[]> {
    this.logger.log(`Comparing ${inputs.length} markets`);

    return Promise.all(inputs.map((input) => this.predictMarketTrends(input)));
  }
}
