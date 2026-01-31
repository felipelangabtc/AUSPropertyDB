// API Request/Response types

import { z } from 'zod';
import { PropertySchema, ListingSchema, UserSchema, AlertSchema } from './index';

export const SearchFiltersSchema = z.object({
  query: z.string().optional(),
  suburb: z.string().optional(),
  postcode: z.string().optional(),
  min_price: z.number().int().positive().optional(),
  max_price: z.number().int().positive().optional(),
  min_beds: z.number().int().min(0).optional(),
  max_beds: z.number().int().min(0).optional(),
  property_types: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  min_land_size: z.number().optional(),
  max_land_size: z.number().optional(),
  listed_in_days: z.number().int().positive().optional(),
  multi_source_only: z.boolean().optional(),
  price_dropped: z.boolean().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius_km: z.number().positive().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort_by: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'largest_drop', 'convenience_score'])
    .default('newest'),
});
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const SearchResultSchema = z.object({
  properties: z.array(PropertySchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  has_more: z.boolean(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const PropertyDetailSchema = PropertySchema.extend({
  listings: z.array(ListingSchema),
  listings_by_source: z.record(z.array(ListingSchema)),
  poi_nearby: z.array(
    z.object({
      poi: z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
      }),
      distance_meters: z.number(),
      duration_drive_seconds: z.number().nullable(),
      duration_walk_seconds: z.number().nullable(),
    })
  ),
  price_history: z.array(
    z.object({
      price: z.number(),
      captured_at: z.date(),
    })
  ),
  watched_by_user: z.boolean().optional(),
});
export type PropertyDetail = z.infer<typeof PropertyDetailSchema>;

export const CreateWatchlistSchema = z.object({
  property_id: z.string().uuid(),
  notes: z.string().optional(),
});

export const CreateAlertSchema = z.object({
  type: z.enum(['price_drop', 'new_listing', 'status_change', 'new_area']),
  channel: z.enum(['email', 'push', 'webhook']),
  saved_search_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  threshold_value: z.number().optional(),
});

export const SignUpSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export const SignInSchema = z.object({
  email: z.string().email(),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    })
    .optional(),
  timestamp: z.date(),
});
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: Date;
};

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.object({
      items: z.array(dataSchema),
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
      total_pages: z.number().int(),
    }),
    timestamp: z.date(),
  });
