/**
 * Load Testing Module Index
 *
 * Exports all load testing services and utilities
 */

export {
  LoadTestingService,
  LoadTestConfig,
  LoadTestResult,
  LatencyStats,
  ErrorStats,
  SuccessCriteria,
  TestEndpoint,
} from './load-testing.service';

/**
 * Load Testing Services Registry
 */
export const LOAD_TESTING_SERVICES = ['LoadTestingService'];

/**
 * Test Types
 */
export const TEST_TYPES = ['smoke', 'load', 'spike', 'stress', 'endurance'];

/**
 * Default Test Configurations
 */
export const DEFAULT_TEST_TYPES = {
  smoke: {
    description: 'Basic functionality test with light load (10 users)',
    duration: 60,
    peakLoad: 10,
  },
  load: {
    description: 'Standard load test (100 concurrent users)',
    duration: 300,
    peakLoad: 100,
  },
  spike: {
    description: 'Sudden load increase test (500 users instantly)',
    duration: 120,
    peakLoad: 500,
  },
  stress: {
    description: 'System breaking point test (1000 concurrent users)',
    duration: 600,
    peakLoad: 1000,
  },
  endurance: {
    description: 'Long-duration stability test (1 hour at 200 users)',
    duration: 3600,
    peakLoad: 200,
  },
};

/**
 * Performance Targets
 */
export const PERFORMANCE_TARGETS = {
  apiLatency: {
    p95: 500, // ms
    p99: 1000, // ms
  },
  errorRate: 1, // percentage
  throughput: 500, // requests/sec
  cpu: 80, // percentage
  memory: 1000, // MB
};

/**
 * Capacity Metrics
 */
export const CAPACITY_METRICS = {
  smallScale: {
    users: 100,
    apiServers: 3,
    dbServers: 2,
    cacheServers: 1,
  },
  mediumScale: {
    users: 500,
    apiServers: 10,
    dbServers: 3,
    cacheServers: 2,
  },
  largeScale: {
    users: 1000,
    apiServers: 20,
    dbServers: 5,
    cacheServers: 3,
  },
};

/**
 * Endpoints to Load Test
 */
export const DEFAULT_TEST_ENDPOINTS = [
  {
    name: 'List Properties',
    method: 'GET' as const,
    path: '/api/properties?limit=10',
    weight: 40,
  },
  {
    name: 'Search Properties',
    method: 'GET' as const,
    path: '/api/properties/search?q=Sydney',
    weight: 30,
  },
  {
    name: 'Get Property Details',
    method: 'GET' as const,
    path: '/api/properties/123',
    weight: 20,
  },
  {
    name: 'Create Alert',
    method: 'POST' as const,
    path: '/api/alerts',
    weight: 10,
  },
];
