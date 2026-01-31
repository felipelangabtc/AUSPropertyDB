import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerRegistry } from '../src/common/resilience/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100, // Short timeout for tests
      monitoringPeriod: 1000,
    });
  });

  describe('CLOSED state (normal operation)', () => {
    it('should execute successfully when service is working', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should increment failure count on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getFailureCount()).toBe(2);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reset failure count on success', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValue('success');

      try {
        await breaker.execute(fn);
      } catch (err) {
        // Expected first failure
      }

      expect(breaker.getFailureCount()).toBe(1);

      await breaker.execute(fn);
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('OPEN state (service unavailable)', () => {
    it('should open circuit after threshold failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reject calls immediately when open', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Try to execute - should be rejected immediately
      const failFn = vi.fn();
      try {
        await breaker.execute(failFn);
      } catch (err) {
        expect((err as Error).message).toContain('Circuit breaker is OPEN');
      }

      // Original function should not be called
      expect(failFn).not.toHaveBeenCalled();
    });
  });

  describe('HALF_OPEN state (recovery test)', () => {
    it('should transition to HALF_OPEN after reset timeout', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(breaker.getState()).toBe('HALF_OPEN');
    });

    it('should close circuit if recovery succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValue(new Error('failure'))
        .mockRejectedValue(new Error('failure'))
        .mockRejectedValue(new Error('failure'))
        .mockResolvedValue('success');

      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Wait for transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Execute successfully
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reopen circuit if recovery fails', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Wait for transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Execute and fail
      try {
        await breaker.execute(fn);
      } catch (err) {
        // Expected
      }

      // Should still be HALF_OPEN or transition back to OPEN
      expect([' HALF_OPEN', 'OPEN']).toContain(breaker.getState());
    });
  });

  describe('State changes', () => {
    it('should call onStateChange callback', (done) => {
      const callback = vi.fn();
      const customBreaker = new CircuitBreaker({
        failureThreshold: 2,
        onStateChange: callback,
      });

      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      // Trigger failures to open
      for (let i = 0; i < 2; i++) {
        try {
          customBreaker.executeSync(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(callback).toHaveBeenCalledWith('CLOSED', 'OPEN');
      done();
    });

    it('should manually reset circuit breaker', () => {
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          breaker.execute(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should manually open circuit breaker', async () => {
      breaker.open();
      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.isAvailable()).toBe(false);
    });
  });

  describe('Synchronous execution', () => {
    it('should execute synchronously', () => {
      const fn = vi.fn().mockReturnValue('success');
      const result = breaker.executeSync(fn);

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should open on sync failures', () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('failure');
      });

      for (let i = 0; i < 3; i++) {
        try {
          breaker.executeSync(fn);
        } catch (err) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('Metrics', () => {
    it('should provide metrics', () => {
      const metrics = breaker.getMetrics();

      expect(metrics).toHaveProperty('state');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('lastFailureTime');
      expect(metrics).toHaveProperty('isAvailable');
      expect(metrics.state).toBe('CLOSED');
      expect(metrics.failureCount).toBe(0);
      expect(metrics.isAvailable).toBe(true);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  it('should create and cache circuit breakers', () => {
    const breaker1 = registry.getBreaker('service1');
    const breaker2 = registry.getBreaker('service1');

    expect(breaker1).toBe(breaker2); // Same instance
  });

  it('should create different breakers for different names', () => {
    const breaker1 = registry.getBreaker('service1');
    const breaker2 = registry.getBreaker('service2');

    expect(breaker1).not.toBe(breaker2);
  });

  it('should return all breakers', () => {
    registry.getBreaker('service1');
    registry.getBreaker('service2');
    registry.getBreaker('service3');

    const all = registry.getAllBreakers();
    expect(Object.keys(all)).toHaveLength(3);
    expect(all).toHaveProperty('service1');
    expect(all).toHaveProperty('service2');
    expect(all).toHaveProperty('service3');
  });

  it('should get metrics for all breakers', () => {
    registry.getBreaker('service1');
    registry.getBreaker('service2');

    const metrics = registry.getMetrics();
    expect(metrics).toHaveProperty('service1');
    expect(metrics).toHaveProperty('service2');
    expect(metrics.service1).toHaveProperty('state');
    expect(metrics.service1).toHaveProperty('failureCount');
  });

  it('should reset all breakers', () => {
    const b1 = registry.getBreaker('service1');
    const b2 = registry.getBreaker('service2');

    b1.open();
    b2.open();

    expect(b1.getState()).toBe('OPEN');
    expect(b2.getState()).toBe('OPEN');

    registry.resetAll();

    expect(b1.getState()).toBe('CLOSED');
    expect(b2.getState()).toBe('CLOSED');
  });
});
