/**
 * Performance Module Exports
 *
 * CDN, image optimization, query profiling, and resource monitoring
 */

export {
  CDNConfigService,
  CDNConfig,
  CacheControl,
  OriginSettings,
  CompressionUtils,
  MinificationUtils,
} from './cdn.config';

export {
  ImageOptimizerService,
  ImageOptimizationConfig,
  ImageVariant,
  OptimizedImage,
  ImageMetadataUtils,
} from './image-optimizer';

export {
  QueryProfilerService,
  QueryProfile,
  ExecutionPlan,
  QueryOptimizationRecommendation,
  ResourceMonitorService,
} from './query-profiler';

export { CompressionMiddleware, ResponseCompressionInterceptor } from './compression.middleware';

/**
 * Performance Services Registry
 */
export const PERFORMANCE_SERVICES = [
  CDNConfigService,
  ImageOptimizerService,
  QueryProfilerService,
  ResourceMonitorService,
];

/**
 * Performance Middleware & Interceptors
 */
export const PERFORMANCE_MIDDLEWARE = [CompressionMiddleware];
export const PERFORMANCE_INTERCEPTORS = [ResponseCompressionInterceptor];
