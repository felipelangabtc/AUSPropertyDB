import { Controller, Get, Post, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { PropertyValuationService, PropertyValuationInput } from './property-valuation.service';
import { MarketPredictionService, MarketPredictionInput } from './market-prediction.service';
import {
  RecommendationEngineService,
  UserProfile,
  Property,
} from './recommendation-engine.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@nestjs/common';

/**
 * ML Features Controller
 * Handles property valuations, market predictions, and recommendations
 */
@Controller('api/v1/ml')
export class MLController {
  private readonly logger = new Logger(MLController.name);

  constructor(
    private valuationService: PropertyValuationService,
    private marketPredictionService: MarketPredictionService,
    private recommendationService: RecommendationEngineService
  ) {}

  /**
   * Valuate single property
   */
  @Post('valuations')
  @UseGuards(AuthGuard('jwt'))
  async valuateProperty(@Body() input: PropertyValuationInput): Promise<any> {
    this.logger.log(`Valuating property in ${input.location}`);
    return this.valuationService.predictValuation(input);
  }

  /**
   * Batch valuate properties
   */
  @Post('valuations/batch')
  @UseGuards(AuthGuard('jwt'))
  async batchValuate(@Body() inputs: PropertyValuationInput[]): Promise<any> {
    this.logger.log(`Batch valuating ${inputs.length} properties`);
    return this.valuationService.batchValuate(inputs);
  }

  /**
   * Get property valuation by ID
   */
  @Get('valuations/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  async getPropertyValuation(@Param('propertyId') propertyId: string): Promise<any> {
    this.logger.log(`Fetching valuation for property: ${propertyId}`);
    // Would fetch from cache/DB in production
    return { propertyId, message: 'Valuation data' };
  }

  /**
   * Predict market trends
   */
  @Post('market-prediction')
  @UseGuards(AuthGuard('jwt'))
  async predictMarket(@Body() input: MarketPredictionInput): Promise<any> {
    this.logger.log(`Predicting market trends for ${input.location}`);
    return this.marketPredictionService.predictMarketTrends(input);
  }

  /**
   * Compare multiple markets
   */
  @Post('market-prediction/compare')
  @UseGuards(AuthGuard('jwt'))
  async compareMarkets(@Body() inputs: MarketPredictionInput[]): Promise<any> {
    this.logger.log(`Comparing ${inputs.length} markets`);
    return this.marketPredictionService.compareMarkets(inputs);
  }

  /**
   * Get market trend for location
   */
  @Get('market-prediction/:location')
  @UseGuards(AuthGuard('jwt'))
  async getMarketTrend(@Param('location') location: string): Promise<any> {
    this.logger.log(`Fetching market trend for ${location}`);
    // Would fetch from cache/DB in production
    return { location, trend: 'appreciating' };
  }

  /**
   * Get recommendations for user
   */
  @Post('recommendations')
  @UseGuards(AuthGuard('jwt'))
  async getRecommendations(
    @Body()
    data: {
      userProfile: UserProfile;
      availableProperties: Property[];
      limit?: number;
    },
    @User() currentUser: any
  ): Promise<any> {
    this.logger.log(`Getting recommendations for user: ${currentUser.id}`);

    // Override user ID from JWT
    const userProfile = { ...data.userProfile, userId: currentUser.id };

    return this.recommendationService.getRecommendations(
      userProfile,
      data.availableProperties,
      data.limit || 10
    );
  }

  /**
   * Get personalized recommendations based on user history
   */
  @Get('recommendations/personalized')
  @UseGuards(AuthGuard('jwt'))
  async getPersonalizedRecommendations(@User() currentUser: any): Promise<any> {
    this.logger.log(`Getting personalized recommendations for user: ${currentUser.id}`);
    // Would fetch user profile and properties from DB
    return { message: 'Personalized recommendations' };
  }

  /**
   * Get search suggestions based on user profile
   */
  @Post('search-suggestions')
  @UseGuards(AuthGuard('jwt'))
  async getSearchSuggestions(
    @Body() userProfile: UserProfile,
    @User() currentUser: any
  ): Promise<any> {
    this.logger.log(`Getting search suggestions for user: ${currentUser.id}`);

    return this.recommendationService.getSearchSuggestions(userProfile);
  }

  /**
   * Get price prediction for property
   */
  @Get('price-prediction/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  async getPricePrediction(@Param('propertyId') propertyId: string): Promise<any> {
    this.logger.log(`Getting price prediction for property: ${propertyId}`);
    // Would combine valuation service with market prediction
    return { propertyId, message: 'Price prediction data' };
  }

  /**
   * Get investment analysis
   */
  @Post('investment-analysis')
  @UseGuards(AuthGuard('jwt'))
  async getInvestmentAnalysis(
    @Body()
    data: {
      propertyId: string;
      investmentHorizon: number; // months
      expectedRentalYield?: number;
    },
    @User() currentUser: any
  ): Promise<any> {
    this.logger.log(`Getting investment analysis for property: ${data.propertyId}`);

    // Would combine valuation with market prediction to provide investment metrics
    return {
      propertyId: data.propertyId,
      capRate: 0.045, // 4.5%
      cashOnCash: 0.065, // 6.5%
      returnOnInvestment: 0.085, // 8.5%
      expectedValue12M: 850000,
      riskScore: 35,
    };
  }

  /**
   * Get portfolio analysis
   */
  @Post('portfolio-analysis')
  @UseGuards(AuthGuard('jwt'))
  async getPortfolioAnalysis(
    @Body() data: { propertyIds: string[] },
    @User() currentUser: any
  ): Promise<any> {
    this.logger.log(`Analyzing portfolio of ${data.propertyIds.length} properties`);

    // Would analyze entire portfolio for diversification, risk, returns
    return {
      portfolioValue: 2500000,
      totalRisk: 42,
      diversification: 'good',
      expectedReturn: 0.065,
      properties: data.propertyIds.length,
    };
  }

  /**
   * Health check
   */
  @Get('health')
  async healthCheck(): Promise<{
    valuation: boolean;
    marketPrediction: boolean;
    recommendations: boolean;
  }> {
    return {
      valuation: true,
      marketPrediction: true,
      recommendations: true,
    };
  }
}
