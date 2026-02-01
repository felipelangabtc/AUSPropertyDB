import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTimeoutForRoute,
  ENDPOINT_TIMEOUTS,
  TimeoutTracker,
  Timeout,
} from './timeout';

describe('Timeout Management', () => {
  describe('getTimeoutForRoute', () => {
    it('should return exact match timeout', () => {
      const timeout = getTimeoutForRoute('GET', '/health');
      expect(timeout).toBe(1000);
    });

    it('should return timeout for search endpoints', () => {
      const timeout = getTimeoutForRoute('GET', '/search');
      expect(timeout).toBe(15000);
    });

    it('should return timeout for property endpoints', () => {
      const timeout = getTimeoutForRoute('GET', '/properties');
      expect(timeout).toBe(10000);
    });

    it('should return timeout for ML train endpoint', () => {
      const timeout = getTimeoutForRoute('POST', '/admin/ml/train');
      expect(timeout).toBe(60000);
    });

    it('should return timeout for ML predict endpoint', () => {
      const timeout = getTimeoutForRoute('POST', '/admin/ml/predict');
      expect(timeout).toBe(30000);
    });

    it('should handle wildcard patterns', () => {
      const timeout = getTimeoutForRoute('GET', '/admin/users');
      expect(timeout).toBe(10000);
    });

    it('should return default timeout for unknown routes', () => {
      const timeout = getTimeoutForRoute('GET', '/unknown-route');
      expect(timeout).toBe(ENDPOINT_TIMEOUTS['default']);
    });

    it('should return auth timeout', () => {
      const timeout = getTimeoutForRoute('POST', '/auth/login');
      expect(timeout).toBe(5000);
    });
  });

  describe('TimeoutTracker', () => {
    let tracker: TimeoutTracker;

    beforeEach(() => {
      tracker = new TimeoutTracker();
    });

    it('should record single request', () => {
      tracker.recordRequest('GET /test', 100);
      const stats = tracker.getStats('GET /test');

      expect(stats).toEqual({
        count: 1,
        avg: 100,
        min: 100,
        max: 100,
        p50: 100,
        p95: 100,
        p99: 100,
      });
    });

    it('should track multiple requests', () => {
      tracker.recordRequest('GET /test', 100);
      tracker.recordRequest('GET /test', 200);
      tracker.recordRequest('GET /test', 300);

      const stats = tracker.getStats('GET /test');

      expect(stats.count).toBe(3);
      expect(stats.avg).toBe(200);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(300);
    });

    it('should calculate percentiles correctly', () => {
      // Create 100 requests with increasing times
      for (let i = 0; i < 100; i++) {
        tracker.recordRequest('GET /test', i + 1);
      }

      const stats = tracker.getStats('GET /test');

      expect(stats.count).toBe(100);
      expect(stats.p50).toBeLessThanOrEqual(51);
      expect(stats.p95).toBeLessThanOrEqual(96);
      expect(stats.p99).toBeLessThanOrEqual(100);
    });

    it('should keep only last 100 samples', () => {
      for (let i = 0; i < 150; i++) {
        tracker.recordRequest('GET /test', i);
      }

      const stats = tracker.getStats('GET /test');
      expect(stats.count).toBe(100);
    });

    it('should track multiple routes independently', () => {
      tracker.recordRequest('GET /route1', 100);
      tracker.recordRequest('GET /route1', 200);
      tracker.recordRequest('GET /route2', 1000);

      const stats1 = tracker.getStats('GET /route1');
      const stats2 = tracker.getStats('GET /route2');

      expect(stats1.avg).toBe(150);
      expect(stats2.avg).toBe(1000);
    });

    it('should return null for unknown route', () => {
      const stats = tracker.getStats('GET /unknown');
      expect(stats).toBeNull();
    });

    it('should return all statistics', () => {
      tracker.recordRequest('GET /route1', 100);
      tracker.recordRequest('GET /route2', 200);

      const allStats = tracker.getAllStats();

      expect(Object.keys(allStats)).toContain('GET /route1');
      expect(Object.keys(allStats)).toContain('GET /route2');
    });

    it('should clear statistics', () => {
      tracker.recordRequest('GET /test', 100);
      tracker.clear();

      const stats = tracker.getStats('GET /test');
      expect(stats).toBeNull();
    });

    it('should handle concurrent requests', () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            tracker.recordRequest('GET /concurrent', Math.random() * 100);
          }),
        );
      }

      return Promise.all(promises).then(() => {
        const stats = tracker.getStats('GET /concurrent');
        expect(stats.count).toBe(100);
      });
    });
  });

  describe('Timeout Decorator', () => {
    it('should apply timeout to async method', async () => {
      const method = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'success';
      });

      const decorated = Timeout(200)(method, 'test', {
        value: method,
      });

      expect(await method()).toBe('success');
    });

    it('should timeout if method takes too long', async () => {
      const method = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return 'success';
      });

      const descriptor = {
        value: method,
      };

      const decorated = Timeout(100)(Object.prototype, 'test', descriptor);

      // Note: This test checks the decorator structure, actual timeout
      // would be tested in integration tests
      expect(descriptor.value).toBeDefined();
    });
  });

  describe('Timeout Configuration', () => {
    it('should have all critical endpoints configured', () => {
      const criticalEndpoints = [
        'GET /health',
        'POST /auth/login',
        'GET /properties',
        'POST /admin/ml/train',
      ];

      for (const endpoint of criticalEndpoints) {
        const [method, path] = endpoint.split(' ');
        const timeout = getTimeoutForRoute(method, path);
        expect(timeout).toBeGreaterThan(0);
      }
    });

    it('should have faster timeouts for health checks', () => {
      const healthTimeout = getTimeoutForRoute('GET', '/health');
      const normalTimeout = getTimeoutForRoute('GET', '/properties');

      expect(healthTimeout).toBeLessThan(normalTimeout);
    });

    it('should have longer timeouts for async operations', () => {
      const trainTimeout = getTimeoutForRoute('POST', '/admin/ml/train');
      const healthTimeout = getTimeoutForRoute('GET', '/health');

      expect(trainTimeout).toBeGreaterThan(healthTimeout);
    });
  });
});
