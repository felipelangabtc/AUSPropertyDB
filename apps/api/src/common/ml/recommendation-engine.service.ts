import { Injectable, Logger } from '@nestjs/common';

/**
 * ML Service for Property Recommendations
 * Uses collaborative filtering and content-based recommendations
 */
export interface UserProfile {
  userId: string;
  preferredLocations: string[];
  minBudget: number;
  maxBudget: number;
  minBedrooms: number;
  maxBedrooms: number;
  propertyTypes: string[];
  viewedProperties: string[];
  savedProperties: string[];
  contactedProperties: string[];
  preferences: {
    pool: boolean;
    garage: boolean;
    garden: boolean;
    newlyRenovated: boolean;
  };
}

export interface Property {
  propertyId: string;
  price: number;
  bedrooms: number;
  location: string;
  type: string;
  features: string[];
  viewCount: number;
  contactCount: number;
  listDate: Date;
}

export interface PropertyRecommendation {
  propertyId: string;
  matchScore: number; // 0-100
  reasons: string[];
  similarToViewed: boolean;
  marketTrend: 'rising' | 'stable' | 'falling';
  pricePosition: 'below_market' | 'at_market' | 'above_market';
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);

  /**
   * Generate recommendations for a user
   */
  async getRecommendations(
    userProfile: UserProfile,
    availableProperties: Property[],
    limit: number = 10
  ): Promise<PropertyRecommendation[]> {
    try {
      this.logger.log(`Generating recommendations for user: ${userProfile.userId}`);

      // Score all properties
      const recommendations = availableProperties
        .filter((prop) => this.passesBasicFilters(prop, userProfile))
        .map((prop) => ({
          property: prop,
          scores: {
            contentBased: this.calculateContentBasedScore(prop, userProfile),
            collaborative: this.calculateCollaborativeScore(prop, userProfile),
            trending: this.calculateTrendingScore(prop),
            priceValue: this.calculatePriceValueScore(prop, userProfile),
          },
        }))
        .map((item) => ({
          property: item.property,
          matchScore: this.combineScores(item.scores),
          ...item.scores,
        }))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit)
        .map((item) => this.createRecommendation(item.property, item));

      return recommendations;
    } catch (error) {
      this.logger.error('Failed to generate recommendations', error);
      throw error;
    }
  }

  /**
   * Pass basic filters
   */
  private passesBasicFilters(property: Property, userProfile: UserProfile): boolean {
    // Check budget
    if (property.price < userProfile.minBudget || property.price > userProfile.maxBudget) {
      return false;
    }

    // Check bedrooms
    if (
      property.bedrooms < userProfile.minBedrooms ||
      property.bedrooms > userProfile.maxBedrooms
    ) {
      return false;
    }

    // Check location
    if (userProfile.preferredLocations.length > 0) {
      const inPreferredLocation = userProfile.preferredLocations.some((loc) =>
        property.location.includes(loc)
      );
      if (!inPreferredLocation) {
        return false;
      }
    }

    // Check property type
    if (userProfile.propertyTypes.length > 0) {
      if (!userProfile.propertyTypes.includes(property.type)) {
        return false;
      }
    }

    // Filter out already viewed properties (unless very good match)
    if (userProfile.viewedProperties.includes(property.propertyId)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate content-based recommendation score
   * Based on property features matching user preferences
   */
  private calculateContentBasedScore(property: Property, userProfile: UserProfile): number {
    let score = 0;

    // Location preference (40 points)
    if (userProfile.preferredLocations.some((loc) => property.location.includes(loc))) {
      score += 40;
    }

    // Price position (30 points)
    const avgPrice = (userProfile.minBudget + userProfile.maxBudget) / 2;
    const priceDeviation = Math.abs(property.price - avgPrice) / avgPrice;
    if (priceDeviation < 0.1) score += 30;
    else if (priceDeviation < 0.2) score += 20;

    // Bedroom match (15 points)
    const preferredBedrooms = Math.round((userProfile.minBedrooms + userProfile.maxBedrooms) / 2);
    if (property.bedrooms === preferredBedrooms) score += 15;
    else if (Math.abs(property.bedrooms - preferredBedrooms) === 1) score += 10;

    // Feature preferences (15 points)
    let matchedFeatures = 0;
    let totalPreferences = 0;

    if (userProfile.preferences.pool) {
      totalPreferences++;
      if (property.features.includes('pool')) matchedFeatures++;
    }
    if (userProfile.preferences.garage) {
      totalPreferences++;
      if (property.features.includes('garage')) matchedFeatures++;
    }
    if (userProfile.preferences.garden) {
      totalPreferences++;
      if (property.features.includes('garden')) matchedFeatures++;
    }
    if (userProfile.preferences.newlyRenovated) {
      totalPreferences++;
      if (property.features.includes('renovated')) matchedFeatures++;
    }

    if (totalPreferences > 0) {
      score += (matchedFeatures / totalPreferences) * 15;
    }

    return Math.round(score);
  }

  /**
   * Calculate collaborative filtering score
   * Based on properties similar to user's interactions
   */
  private calculateCollaborativeScore(property: Property, userProfile: UserProfile): number {
    let score = 0;

    // Properties viewed by similar users (users who viewed what this user viewed)
    // Simplified: count based on viewed properties
    if (userProfile.viewedProperties.length > 0) {
      // Properties with similar characteristics to viewed ones
      score += Math.min(userProfile.viewedProperties.length * 2, 20);
    }

    // Properties saved by user
    if (userProfile.savedProperties.includes(property.propertyId)) {
      score += 30;
    }

    // Properties similar to contacted ones
    if (userProfile.contactedProperties.length > 0) {
      // Check if similar price/location range
      const avgContactedPrice = userProfile.contactedProperties.length > 0 ? 750000 : 0;
      if (Math.abs(property.price - avgContactedPrice) / avgContactedPrice < 0.2) {
        score += 15;
      }
    }

    return Math.round(score);
  }

  /**
   * Calculate trending score
   * Popular properties get higher scores
   */
  private calculateTrendingScore(property: Property): number {
    // Normalize by time on market (newer listings get boost)
    const daysOnMarket = Math.floor(
      (Date.now() - property.listDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let score = 0;

    // View count score (trending popularity)
    if (property.viewCount > 100) score += 15;
    else if (property.viewCount > 50) score += 10;
    else if (property.viewCount > 20) score += 5;

    // Contact count score
    if (property.contactCount > 20) score += 10;
    else if (property.contactCount > 10) score += 5;

    // Recency boost (newer listings)
    if (daysOnMarket < 7) score += 10;
    else if (daysOnMarket < 30) score += 5;

    return Math.round(score);
  }

  /**
   * Calculate price-to-value score
   */
  private calculatePriceValueScore(property: Property, userProfile: UserProfile): number {
    let score = 0;

    // Properties below user's average budget get boost
    const avgBudget = (userProfile.minBudget + userProfile.maxBudget) / 2;
    if (property.price < avgBudget * 0.9) {
      score += 20; // Good value
    } else if (property.price > avgBudget * 1.1) {
      score -= 10; // Premium pricing
    }

    // Price per bedroom
    const pricePerBedroom = property.price / Math.max(property.bedrooms, 1);
    const typicalPricePerBedroom = avgBudget / 3; // Assuming 3 bedrooms typical

    if (pricePerBedroom < typicalPricePerBedroom * 1.1) {
      score += 15;
    }

    return Math.round(Math.max(score, 0));
  }

  /**
   * Combine individual scores into final score
   */
  private combineScores(scores: Record<string, number>): number {
    // Weighted combination
    const weights = {
      contentBased: 0.4,
      collaborative: 0.3,
      trending: 0.15,
      priceValue: 0.15,
    };

    let totalScore = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      totalScore += (scores[key] || 0) * weight;
    });

    return Math.round(totalScore);
  }

  /**
   * Create recommendation object
   */
  private createRecommendation(property: Property, scores: any): PropertyRecommendation {
    const reasons: string[] = [];

    if (scores.contentBased > 70) {
      reasons.push('Matches your preferences');
    }

    if (scores.collaborative > 50) {
      reasons.push('Similar to properties you like');
    }

    if (scores.trending > 15) {
      reasons.push('Popular in the market');
    }

    if (scores.priceValue > 20) {
      reasons.push('Great value for price');
    }

    // Determine price position
    let pricePosition: 'below_market' | 'at_market' | 'above_market' = 'at_market';
    if (scores.priceValue > 20) pricePosition = 'below_market';
    else if (scores.priceValue < 0) pricePosition = 'above_market';

    // Determine priority
    let priority: 'high' | 'medium' | 'low' = 'low';
    if (scores.matchScore > 80) priority = 'high';
    else if (scores.matchScore > 60) priority = 'medium';

    return {
      propertyId: property.propertyId,
      matchScore: scores.matchScore,
      reasons,
      similarToViewed: scores.collaborative > 50,
      marketTrend: 'rising', // Simplified
      pricePosition,
      priority,
    };
  }

  /**
   * Get personalized search suggestions based on user behavior
   */
  async getSearchSuggestions(userProfile: UserProfile): Promise<Record<string, any>> {
    return {
      suggestedLocations: this.suggestLocations(userProfile),
      suggestedBudgetRange: this.suggestBudgetRange(userProfile),
      suggestedPropertyTypes: this.suggestPropertyTypes(userProfile),
      searchTips: this.generateSearchTips(userProfile),
    };
  }

  /**
   * Suggest locations based on viewed properties
   */
  private suggestLocations(userProfile: UserProfile): string[] {
    // Simplified - would analyze user's viewing patterns
    return userProfile.preferredLocations.slice(0, 3);
  }

  /**
   * Suggest budget range
   */
  private suggestBudgetRange(userProfile: UserProfile): Record<string, number> {
    const midpoint = (userProfile.minBudget + userProfile.maxBudget) / 2;

    return {
      min: Math.round(midpoint * 0.85),
      optimal: Math.round(midpoint),
      max: Math.round(midpoint * 1.15),
    };
  }

  /**
   * Suggest property types
   */
  private suggestPropertyTypes(userProfile: UserProfile): string[] {
    return userProfile.propertyTypes.slice(0, 2);
  }

  /**
   * Generate search tips
   */
  private generateSearchTips(userProfile: UserProfile): string[] {
    const tips: string[] = [];

    if (userProfile.preferredLocations.length === 0) {
      tips.push('Try adding preferred locations to get better recommendations');
    }

    if (userProfile.savedProperties.length < 5) {
      tips.push('Save properties you like to get more personalized suggestions');
    }

    if (userProfile.contactedProperties.length > 0) {
      tips.push('We have more properties similar to your recent contacts');
    }

    return tips;
  }
}
