import { z } from 'zod';

// ============ Core Entity Types ============

export const PropertyTypeEnum = z.enum([
  'house',
  'apartment',
  'townhouse',
  'land',
  'commercial',
  'industrial',
  'other',
]);
export type PropertyType = z.infer<typeof PropertyTypeEnum>;

export const ListingStatusEnum = z.enum([
  'active',
  'under_offer',
  'sold',
  'removed',
  'delisted',
  'archived',
]);
export type ListingStatus = z.infer<typeof ListingStatusEnum>;

export const ListingEventTypeEnum = z.enum([
  'listed',
  'price_changed',
  'status_changed',
  'delisted',
  'relisted',
  'source_added',
  'source_removed',
  'merged',
]);
export type ListingEventType = z.infer<typeof ListingEventTypeEnum>;

// ============ Property ============

export const PropertySchema = z.object({
  id: z.string().uuid(),
  canonical_address: z.string(),
  address_fingerprint: z.string(),
  lat: z.number(),
  lng: z.number(),
  suburb: z.string(),
  postcode: z.string(),
  state: z.string(),
  country: z.string().default('AU'),
  lga: z.string().optional(),
  sa1: z.string().optional(),
  sa2: z.string().optional(),
  sa3: z.string().optional(),
  sa4: z.string().optional(),
  property_type: PropertyTypeEnum,
  bedrooms: z.number().int().min(0).nullable(),
  bathrooms: z.number().int().min(0).nullable(),
  parking_spaces: z.number().int().min(0).nullable(),
  land_size_m2: z.number().positive().nullable(),
  building_size_m2: z.number().positive().nullable(),
  year_built: z.number().int().nullable(),
  convenience_score: z.number().min(0).max(100).default(50),
  last_enriched_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Property = z.infer<typeof PropertySchema>;

// ============ Listing ============

export const ListingSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  source: z.string(),
  source_listing_id: z.string(),
  url: z.string().url(),
  first_seen_at: z.date(),
  last_seen_at: z.date(),
  listed_at: z.date(),
  status: ListingStatusEnum,
  agent_name: z.string().optional(),
  agency_name: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  price_display: z.string().optional(),
  price_numeric_min: z.number().int().positive().nullable(),
  price_numeric_max: z.number().int().positive().nullable(),
  currency: z.string().default('AUD'),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Listing = z.infer<typeof ListingSchema>;

// ============ Price History ============

export const PriceHistorySchema = z.object({
  id: z.string().uuid(),
  listing_id: z.string().uuid(),
  price: z.number().int().positive(),
  currency: z.string().default('AUD'),
  captured_at: z.date(),
});
export type PriceHistory = z.infer<typeof PriceHistorySchema>;

// ============ Listing Event ============

export const ListingEventSchema = z.object({
  id: z.string().uuid(),
  listing_id: z.string().uuid(),
  event_type: ListingEventTypeEnum,
  old_value: z.string().nullable(),
  new_value: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(),
  occurred_at: z.date(),
});
export type ListingEvent = z.infer<typeof ListingEventSchema>;

// ============ Source ============

export const SourceMethodEnum = z.enum(['api', 'scrape', 'feed', 'manual']);

export const SourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string(),
  method: SourceMethodEnum,
  is_active: z.boolean().default(true),
  rate_limit_requests_per_hour: z.number().int().positive().nullable(),
  robots_txt_checked_at: z.date().nullable(),
  tos_notes: z.string().optional(),
  requires_auth: z.boolean().default(false),
  auth_required_date: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Source = z.infer<typeof SourceSchema>;

// ============ POI (Points of Interest) ============

export const POICategoryEnum = z.enum([
  'school',
  'transport',
  'shopping',
  'hospital',
  'beach',
  'restaurant',
  'park',
  'gym',
  'library',
  'pharmacy',
  'grocery',
]);
export type POICategory = z.infer<typeof POICategoryEnum>;

export const POISchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: POICategoryEnum,
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.date(),
});
export type POI = z.infer<typeof POISchema>;

// ============ Property-POI Distance ============

export const PropertyPOISchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  poi_id: z.string().uuid(),
  distance_meters: z.number().positive(),
  duration_drive_seconds: z.number().positive().nullable(),
  duration_walk_seconds: z.number().positive().nullable(),
  duration_transit_seconds: z.number().positive().nullable(),
  computed_at: z.date(),
});
export type PropertyPOI = z.infer<typeof PropertyPOISchema>;

// ============ User & Auth ============

export const UserRoleEnum = z.enum(['user', 'analyst', 'admin']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const UserPlanEnum = z.enum(['free', 'pro', 'enterprise']);
export type UserPlan = z.infer<typeof UserPlanEnum>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  role: UserRoleEnum.default('user'),
  plan: UserPlanEnum.default('free'),
  avatar_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
  last_login_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type User = z.infer<typeof UserSchema>;

// ============ Watchlist ============

export const WatchlistSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  property_id: z.string().uuid(),
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Watchlist = z.infer<typeof WatchlistSchema>;

// ============ Saved Search ============

export const SavedSearchSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  filters: z.record(z.unknown()),
  notify_on_changes: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
});
export type SavedSearch = z.infer<typeof SavedSearchSchema>;

// ============ Alert ============

export const AlertTypeEnum = z.enum(['price_drop', 'new_listing', 'status_change', 'new_area']);
export type AlertType = z.infer<typeof AlertTypeEnum>;

export const AlertChannelEnum = z.enum(['email', 'push', 'webhook']);
export type AlertChannel = z.infer<typeof AlertChannelEnum>;

export const AlertSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  saved_search_id: z.string().uuid().nullable(),
  property_id: z.string().uuid().nullable(),
  type: AlertTypeEnum,
  channel: AlertChannelEnum,
  threshold_value: z.number().nullable(),
  is_active: z.boolean().default(true),
  last_triggered_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Alert = z.infer<typeof AlertSchema>;

// ============ Audit Log ============

export const AuditActionEnum = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'export',
  'admin_action',
  'compliance_review',
]);
export type AuditAction = z.infer<typeof AuditActionEnum>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  action: AuditActionEnum,
  resource_type: z.string(),
  resource_id: z.string(),
  changes: z.record(z.unknown()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  timestamp: z.date(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// ============ Merge Review ============

export const MergeReviewStatusEnum = z.enum(['pending', 'approved', 'rejected', 'manual']);

export const MergeReviewSchema = z.object({
  id: z.string().uuid(),
  source_property_id: z.string().uuid(),
  target_property_id: z.string().uuid(),
  match_score: z.number().min(0).max(1),
  status: MergeReviewStatusEnum.default('pending'),
  reviewed_by: z.string().uuid().nullable(),
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type MergeReview = z.infer<typeof MergeReviewSchema>;
