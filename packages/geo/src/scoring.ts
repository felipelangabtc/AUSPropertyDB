import { z } from 'zod';

/**
 * Convenience Score Preset - weights for different user profiles
 */
export interface ConvenienceScorePreset {
  name: string;
  description: string;
  weights: ConvenienceScoreWeights;
}

export interface ConvenienceScoreWeights {
  school: number; // 0-100
  transport: number;
  shopping: number;
  hospital: number;
  beach: number;
  restaurant: number;
  park: number;
  gym: number;
}

const defaultWeights: ConvenienceScoreWeights = {
  school: 15,
  transport: 20,
  shopping: 15,
  hospital: 15,
  beach: 10,
  restaurant: 10,
  park: 10,
  gym: 5,
};

/**
 * Predefined presets for different user profiles
 */
export const ConvenienceScorePresets: Record<string, ConvenienceScorePreset> = {
  family: {
    name: 'Family',
    description: 'Optimized for families with children',
    weights: {
      ...defaultWeights,
      school: 30,
      park: 20,
      transport: 15,
    },
  },
  investor: {
    name: 'Investor',
    description: 'Optimized for property investment returns',
    weights: {
      ...defaultWeights,
      transport: 25,
      shopping: 20,
      school: 10,
      beach: 5,
    },
  },
  student: {
    name: 'Student',
    description: 'Optimized for university students',
    weights: {
      ...defaultWeights,
      transport: 30,
      restaurant: 15,
      shopping: 15,
      gym: 10,
      school: 5,
      beach: 10,
    },
  },
  retiree: {
    name: 'Retiree',
    description: 'Optimized for retirees and seniors',
    weights: {
      ...defaultWeights,
      hospital: 25,
      shopping: 20,
      park: 20,
      restaurant: 15,
      transport: 10,
      school: 0,
    },
  },
};

export interface POIScore {
  category: string;
  count: number;
  averageDistance: number; // meters
  weight: number;
  score: number; // 0-100
}

export interface ConvenienceScoreResult {
  total_score: number; // 0-100
  breakdown: Record<string, POIScore>;
  preset_used: string;
}

/**
 * Calculate convenience score based on nearby POIs
 * Higher score = more convenient location
 */
export function calculateConvenienceScore(
  poiData: Array<{
    category: string;
    distance: number;
  }>,
  preset: keyof typeof ConvenienceScorePresets = 'family'
): ConvenienceScoreResult {
  const presetConfig = ConvenienceScorePresets[preset] || ConvenienceScorePresets.family;
  const weights = presetConfig.weights;

  const breakdown: Record<string, POIScore> = {};

  // Group POIs by category and calculate statistics
  for (const poi of poiData) {
    if (!breakdown[poi.category]) {
      breakdown[poi.category] = {
        category: poi.category,
        count: 0,
        averageDistance: 0,
        weight: weights[poi.category as keyof ConvenienceScoreWeights] || 0,
        score: 0,
      };
    }

    const categoryData = breakdown[poi.category];
    categoryData.count++;
    categoryData.averageDistance =
      (categoryData.averageDistance * (categoryData.count - 1) + poi.distance) / categoryData.count;
  }

  // Calculate score for each category
  for (const category in breakdown) {
    const data = breakdown[category];

    // Distance scoring: closer is better
    // 1km = 100 score, 5km = 50 score, 10km = 0 score
    const distanceKm = data.averageDistance / 1000;
    const distanceScore = Math.max(0, 100 - (distanceKm / 10) * 100);

    // Count scoring: more POIs = better
    const countScore = Math.min(100, (data.count / 3) * 100);

    // Combined score for this category (60% distance, 40% count)
    data.score = distanceScore * 0.6 + countScore * 0.4;
  }

  // Calculate weighted total score
  const totalWeight = Object.values(breakdown).reduce((sum, d) => sum + d.weight, 0);
  const weightedScore = Object.values(breakdown).reduce(
    (sum, d) => sum + (d.score * d.weight) / 100,
    0
  );

  const finalScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 50;

  return {
    total_score: Math.round(finalScore),
    breakdown,
    preset_used: preset,
  };
}

/**
 * Calculate distance score (0-100) where closer is better
 * Used for "best match" sorting
 */
export function calculateDistanceScore(distanceMeters: number, maxDistanceMeters = 5000): number {
  return Math.max(0, Math.round(100 - (distanceMeters / maxDistanceMeters) * 100));
}

/**
 * Normalize scores to 0-100 range
 */
export function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}
