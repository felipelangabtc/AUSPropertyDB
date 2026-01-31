import { z } from 'zod';

/**
 * Centralized validation schemas for AUSPropertyDB
 */

// Common patterns
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?61\d{9}$/; // Australian phone numbers
const POSTCODE_PATTERN = /^\d{4}$/; // Australian postcodes

// Base schemas
export const UUIDSchema = z.string().uuid().describe('UUID identifier');
export const EmailSchema = z.string().email().describe('Email address');
export const PhoneSchema = z.string().regex(PHONE_PATTERN).optional().describe('Australian phone number');
export const PostcodeSchema = z.string().regex(POSTCODE_PATTERN).describe('Australian postcode (4 digits)');
export const PriceSchema = z.number().positive().describe('Price in AUD');
export const LatSchema = z.number().min(-90).max(-10).describe('Latitude for Australia');
export const LngSchema = z.number().min(113).max(154).describe('Longitude for Australia');

// Property schemas
export const PropertyFilterSchema = z.object({
  minPrice: z.number().optional().describe('Minimum price filter'),
  maxPrice: z.number().optional().describe('Maximum price filter'),
  bedrooms: z.number().optional().describe('Number of bedrooms'),
  bathrooms: z.number().optional().describe('Number of bathrooms'),
  parkingSpaces: z.number().optional().describe('Number of parking spaces'),
  propertyType: z.enum(['house', 'unit', 'land', 'townhouse', 'other']).optional().describe('Property type'),
  suburb: z.string().optional().describe('Suburb name'),
  postcode: PostcodeSchema.optional(),
  radius: z.number().positive().optional().describe('Search radius in km'),
});

export const PropertyCreateSchema = z.object({
  address: z.string().min(5).describe('Full address'),
  suburb: z.string().min(2).describe('Suburb name'),
  postcode: PostcodeSchema,
  lat: LatSchema,
  lng: LngSchema,
  bedrooms: z.number().positive().optional().describe('Number of bedrooms'),
  bathrooms: z.number().positive().optional().describe('Number of bathrooms'),
  parkingSpaces: z.number().nonnegative().optional().describe('Number of parking spaces'),
  landSizeM2: z.number().positive().optional().describe('Land size in m²'),
  buildingSizeM2: z.number().positive().optional().describe('Building size in m²'),
  propertyType: z.enum(['house', 'unit', 'land', 'townhouse', 'other']).describe('Property type'),
  yearBuilt: z.number().optional().describe('Year property was built'),
});

// Search schemas
export const SearchQuerySchema = z.object({
  q: z.string().min(2).max(200).describe('Search query'),
  type: z.enum(['property', 'suburb', 'postcode']).default('property').describe('Search type'),
  limit: z.number().min(1).max(100).default(10).describe('Result limit'),
  offset: z.number().nonnegative().default(0).describe('Pagination offset'),
});

// User schemas
export const UserCreateSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).describe('Password (min 8 characters)'),
  firstName: z.string().min(2).optional().describe('First name'),
  lastName: z.string().min(2).optional().describe('Last name'),
  phone: PhoneSchema,
});

export const UserUpdateSchema = z.object({
  email: EmailSchema.optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: PhoneSchema.optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().describe('Password'),
});

// Alert schemas
export const AlertCreateSchema = z.object({
  name: z.string().min(2).max(100).describe('Alert name'),
  description: z.string().optional().describe('Alert description'),
  filters: PropertyFilterSchema.describe('Property filters for alert'),
  frequency: z.enum(['daily', 'weekly', 'monthly']).default('daily').describe('Alert frequency'),
  notificationChannel: z.enum(['email', 'webhook', 'both']).default('email').describe('Notification channel'),
  webhookUrl: z.string().url().optional().describe('Webhook URL for notifications'),
});

// Webhook schemas
export const WebhookCreateSchema = z.object({
  event: z.enum(['property.created', 'property.updated', 'property.price_changed', 'alert.triggered']).describe('Event type'),
  targetUrl: z.string().url().describe('Webhook target URL'),
  secret: z.string().optional().describe('HMAC signing secret'),
  active: z.boolean().default(true).describe('Enable webhook'),
});

export const WebhookRetrySchema = z.object({
  deliveryId: UUIDSchema,
  maxAttempts: z.number().min(1).max(10).default(3).describe('Max retry attempts'),
});

// ML schemas
export const MLPredictSchema = z.object({
  propertyIds: z.array(UUIDSchema).optional().describe('Property IDs to predict'),
  limit: z.number().min(1).max(10000).default(1000).describe('Limit properties'),
});

export const MLTrainSchema = z.object({
  limit: z.number().min(100).max(100000).default(1000).describe('Max properties for training'),
  minSamples: z.number().min(10).default(50).describe('Minimum training samples'),
});

// Pagination schemas
export const PaginationSchema = z.object({
  skip: z.number().nonnegative().default(0).describe('Pagination skip'),
  take: z.number().min(1).max(100).default(20).describe('Pagination take'),
});

// Admin schemas
export const AdminMetricsQuerySchema = z.object({
  from: z.string().datetime().optional().describe('Start date'),
  to: z.string().datetime().optional().describe('End date'),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day').describe('Group by period'),
});

// Connector test schema
export const ConnectorTestSchema = z.object({
  connectorName: z.enum(['demo-json', 'realestate-au', 'domain-au']).describe('Connector to test'),
  queryParams: z.record(z.string()).optional().describe('Query parameters'),
});

/**
 * Helper function to validate and parse data
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Helper function for safe validation (returns error tuple)
 */
export function validateDataSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): [T | null, z.ZodError | null] {
  const result = schema.safeParse(data);
  if (result.success) {
    return [result.data, null];
  }
  return [null, result.error];
}

/**
 * Export all schemas for use in controllers
 */
export const schemas = {
  propertyFilter: PropertyFilterSchema,
  propertyCreate: PropertyCreateSchema,
  searchQuery: SearchQuerySchema,
  userCreate: UserCreateSchema,
  userUpdate: UserUpdateSchema,
  login: LoginSchema,
  alertCreate: AlertCreateSchema,
  webhookCreate: WebhookCreateSchema,
  webhookRetry: WebhookRetrySchema,
  mlPredict: MLPredictSchema,
  mlTrain: MLTrainSchema,
  pagination: PaginationSchema,
  adminMetricsQuery: AdminMetricsQuerySchema,
  connectorTest: ConnectorTestSchema,
};
