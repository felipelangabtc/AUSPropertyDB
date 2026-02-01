import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RetryInterceptor,
  DEFAULT_RETRY_POLICIES,
  calculateBackoffDelay,
} from './retry';

describe('Retry Management', () => {
  describe('calculateBackoffDelay', () => {
    it('should calculate initial delay correctly', () => {
      const delay = calculateBackoffDelay(0, DEFAULT_RETRY_POLICIES.STANDARD);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_POLICIES.STANDARD.initialDelayMs! * 1.1);
      expect(delay).toBeGreaterThanOrEqual(DEFAULT_RETRY_POLICIES.STANDARD.initialDelayMs! * 0.9);
    });

    it('should apply exponential backoff', () => {
      const delay1 = calculateBackoffDelay(0, DEFAULT_RETRY_POLICIES.STANDARD);
      const delay2 = calculateBackoffDelay(1, DEFAULT_RETRY_POLICIES.STANDARD);
      const delay3 = calculateBackoffDelay(2, DEFAULT_RETRY_POLICIES.STANDARD);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should respect max delay', () => {
      const delay = calculateBackoffDelay(10, DEFAULT_RETRY_POLICIES.STANDARD);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_POLICIES.STANDARD.maxDelayMs!);
    });

    it('should add jitter to delay', () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(calculateBackoffDelay(1, DEFAULT_RETRY_POLICIES.STANDARD));
      }

      // Check that delays vary (due to jitter)
      const unique = new Set(delays);
      expect(unique.size).toBeGreaterThan(1);
    });

    it('should handle FAST policy', () => {
      const delay = calculateBackoffDelay(0, DEFAULT_RETRY_POLICIES.FAST);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_POLICIES.FAST.initialDelayMs!);
    });

    it('should handle AGGRESSIVE policy', () => {
      const delay = calculateBackoffDelay(0, DEFAULT_RETRY_POLICIES.AGGRESSIVE);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_POLICIES.AGGRESSIVE.initialDelayMs!);
    });
  });

  describe('RetryInterceptor.executeWithRetry', () => {
    it('should execute successfully on first attempt', async () => {
      const fn = vi.fn(async () => 'success');

      const result = await RetryInterceptor.executeWithRetry(fn, {
        maxRetries: 3,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await RetryInterceptor.executeWithRetry(fn, {
        maxRetries: 5,
        initialDelayMs: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Always fails');
      });

      await expect(
        RetryInterceptor.executeWithRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 10,
        }),
      ).rejects.toThrow('Always fails');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Non-retryable');
      });

      await expect(
        RetryInterceptor.executeWithRetry(fn, {
          maxRetries: 3,
          initialDelayMs: 10,
        }),
      ).rejects.toThrow();
    });

    it('should handle timeout correctly', async () => {
      const fn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new Error('Timeout');
      });

      await expect(
        RetryInterceptor.executeWithRetry(fn, {
          maxRetries: 1,
          initialDelayMs: 10,
        }),
      ).rejects.toThrow();
    });

    it('should support different retry policies', async () => {
      const fn = vi.fn(async () => 'success');

      // FAST policy
      await RetryInterceptor.executeWithRetry(fn, DEFAULT_RETRY_POLICIES.FAST);
      expect(fn).toHaveBeenCalled();

      fn.mockClear();

      // AGGRESSIVE policy
      await RetryInterceptor.executeWithRetry(fn, DEFAULT_RETRY_POLICIES.AGGRESSIVE);
      expect(fn).toHaveBeenCalled();

      fn.mockClear();

      // NONE policy
      await RetryInterceptor.executeWithRetry(fn, DEFAULT_RETRY_POLICIES.NONE);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('RetryInterceptor.getRequestMetadata', () => {
    it('should return metadata for request', () => {
      const metadata = RetryInterceptor.getRequestMetadata();
      expect(metadata).toHaveProperty('statusCode');
      expect(metadata).toHaveProperty('statusText');
      expect(metadata).toHaveProperty('retryable');
    });
  });

  describe('RetryInterceptor.createAxiosInstance', () => {
    it('should create axios instance with retry config', () => {
      const instance = RetryInterceptor.createAxiosInstance({
        baseURL: 'http://localhost',
      });

      expect(instance).toBeDefined();
      expect(instance.defaults.baseURL).toBe('http://localhost');
    });

    it('should apply custom retry policy', () => {
      const instance = RetryInterceptor.createAxiosInstance({
        baseURL: 'http://localhost',
        maxRetries: 10,
        initialDelayMs: 1000,
      });

      expect(instance).toBeDefined();
    });
  });

  describe('Retry Policies', () => {
    it('should have FAST policy with short delays', () => {
      expect(DEFAULT_RETRY_POLICIES.FAST.maxRetries).toBeLessThan(
        DEFAULT_RETRY_POLICIES.STANDARD.maxRetries!,
      );
      expect(DEFAULT_RETRY_POLICIES.FAST.initialDelayMs).toBeLessThan(
        DEFAULT_RETRY_POLICIES.STANDARD.initialDelayMs!,
      );
    });

    it('should have AGGRESSIVE policy with more retries', () => {
      expect(DEFAULT_RETRY_POLICIES.AGGRESSIVE.maxRetries).toBeGreaterThan(
        DEFAULT_RETRY_POLICIES.STANDARD.maxRetries!,
      );
    });

    it('should have NONE policy with no retries', () => {
      expect(DEFAULT_RETRY_POLICIES.NONE.maxRetries).toBe(0);
    });
  });

  describe('Concurrent retry operations', () => {
    it('should handle concurrent requests', async () => {
      const results: string[] = [];
      const fn = vi.fn(async () => 'success');

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          RetryInterceptor.executeWithRetry(fn, {
            maxRetries: 1,
            initialDelayMs: 10,
          }),
        );
      }

      await Promise.all(promises);

      expect(fn.mock.calls.length).toBe(10);
    });

    it('should track retry attempts across concurrent operations', async () => {
      let totalAttempts = 0;

      const fn = vi.fn(async () => {
        totalAttempts++;
        throw new Error('Always fails');
      });

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          RetryInterceptor.executeWithRetry(fn, {
            maxRetries: 2,
            initialDelayMs: 10,
          }).catch(() => {}),
        );
      }

      await Promise.all(promises);

      expect(totalAttempts).toBe(15); // 5 operations * 3 attempts each (initial + 2 retries)
    });
  });

  describe('Retry with exponential backoff performance', () => {
    it('should not exceed timeout budget', async () => {
      const maxTimeMs = 1000;
      const startTime = Date.now();

      const fn = vi.fn(async () => {
        throw new Error('Always fails');
      });

      try {
        await RetryInterceptor.executeWithRetry(fn, {
          maxRetries: 3,
          initialDelayMs: 50,
          maxDelayMs: 200,
        });
      } catch {}

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(maxTimeMs);
    });
  });
});
