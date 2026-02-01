import { describe, it, expect, beforeEach } from 'vitest';
import { Bulkhead, BulkheadRegistry, BULKHEAD_PRESETS } from './bulkhead';
import { HttpException } from '@nestjs/common';

describe('Bulkhead Pattern', () => {
  describe('Bulkhead', () => {
    let bulkhead: Bulkhead;

    beforeEach(() => {
      bulkhead = new Bulkhead({
        name: 'test',
        maxConcurrent: 2,
        maxQueueSize: 3,
      });
    });

    it('should execute single operation', async () => {
      const result = await bulkhead.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should allow up to maxConcurrent operations', async () => {
      const durations = [100, 100];
      const results: string[] = [];

      const promises = durations.map((duration, index) =>
        bulkhead.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, duration));
          results.push(`op${index}`);
          return `success${index}`;
        }),
      );

      const result = await Promise.all(promises);

      expect(result).toEqual(['success0', 'success1']);
    });

    it('should reject when queue is full', async () => {
      // Fill concurrent slots (2)
      const blocking = [
        bulkhead.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }),
        bulkhead.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }),
      ];

      // Fill queue (3)
      for (let i = 0; i < 3; i++) {
        bulkhead.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        });
      }

      // This should be rejected
      await expect(
        bulkhead.execute(async () => 'should fail'),
      ).rejects.toThrow();

      await Promise.allSettled(blocking);
    });

    it('should track status', () => {
      bulkhead.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const status = bulkhead.getStatus();

      expect(status.name).toBe('test');
      expect(status.maxConcurrent).toBe(2);
      expect(status.maxQueueSize).toBe(3);
    });

    it('should return health status', () => {
      const healthy = bulkhead.isHealthy();
      expect(typeof healthy).toBe('boolean');
    });

    it('should track completed count', async () => {
      await bulkhead.execute(async () => 'success1');
      await bulkhead.execute(async () => 'success2');

      const status = bulkhead.getStatus();
      expect(status.completedCount).toBe(2);
    });

    it('should track rejected count', async () => {
      // Fill slots and queue
      const blocking = [
        bulkhead.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }),
        bulkhead.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }),
      ];

      for (let i = 0; i < 3; i++) {
        bulkhead.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        });
      }

      // Reject one
      try {
        await bulkhead.execute(async () => 'fail');
      } catch {}

      const status = bulkhead.getStatus();
      expect(status.rejectedCount).toBe(1);

      await Promise.allSettled(blocking);
    });

    it('should track average execution time', async () => {
      await bulkhead.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const status = bulkhead.getStatus();
      expect(status.avgExecutionTime).toBeGreaterThan(40);
    });

    it('should handle timeout', async () => {
      const bulkheadWithTimeout = new Bulkhead({
        name: 'timeout-test',
        maxConcurrent: 1,
        maxQueueSize: 1,
        timeout: 100,
      });

      await expect(
        bulkheadWithTimeout.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }),
      ).rejects.toThrow();
    });

    it('should reset statistics', async () => {
      await bulkhead.execute(async () => 'success');

      let status = bulkhead.getStatus();
      expect(status.completedCount).toBe(1);

      bulkhead.reset();

      status = bulkhead.getStatus();
      expect(status.completedCount).toBe(0);
      expect(status.rejectedCount).toBe(0);
    });

    it('should calculate utilization percentage', () => {
      const status = bulkhead.getStatus();
      expect(status.utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(status.utilizationPercent).toBeLessThanOrEqual(100);
    });

    it('should handle errors from function', async () => {
      await expect(
        bulkhead.execute(async () => {
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');
    });
  });

  describe('BulkheadRegistry', () => {
    let registry: BulkheadRegistry;

    beforeEach(() => {
      registry = new BulkheadRegistry();
    });

    it('should create bulkhead on demand', () => {
      const bulkhead = registry.getOrCreate({
        name: 'test',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      expect(bulkhead).toBeDefined();
      expect(registry.get('test')).toBe(bulkhead);
    });

    it('should return same bulkhead on multiple calls', () => {
      const config = {
        name: 'test',
        maxConcurrent: 5,
        maxQueueSize: 10,
      };

      const bulkhead1 = registry.getOrCreate(config);
      const bulkhead2 = registry.getOrCreate(config);

      expect(bulkhead1).toBe(bulkhead2);
    });

    it('should execute through registry', async () => {
      registry.getOrCreate({
        name: 'test',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      const result = await registry.execute('test', async () => 'success');

      expect(result).toBe('success');
    });

    it('should throw for unknown bulkhead', async () => {
      await expect(registry.execute('unknown', async () => 'fail')).rejects.toThrow();
    });

    it('should return all statuses', () => {
      registry.getOrCreate({
        name: 'bulkhead1',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      registry.getOrCreate({
        name: 'bulkhead2',
        maxConcurrent: 10,
        maxQueueSize: 20,
      });

      const allStatus = registry.getAllStatus();

      expect(Object.keys(allStatus)).toContain('bulkhead1');
      expect(Object.keys(allStatus)).toContain('bulkhead2');
    });

    it('should return health status', () => {
      registry.getOrCreate({
        name: 'test',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      const health = registry.getHealthStatus();

      expect(health.test).toHaveProperty('healthy');
      expect(typeof health.test.healthy).toBe('boolean');
    });

    it('should reset all statistics', async () => {
      const bulkhead1 = registry.getOrCreate({
        name: 'test1',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      const bulkhead2 = registry.getOrCreate({
        name: 'test2',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      await bulkhead1.execute(async () => 'success1');
      await bulkhead2.execute(async () => 'success2');

      registry.resetAll();

      const status1 = bulkhead1.getStatus();
      const status2 = bulkhead2.getStatus();

      expect(status1.completedCount).toBe(0);
      expect(status2.completedCount).toBe(0);
    });

    it('should return bulkhead count', () => {
      registry.getOrCreate({
        name: 'test1',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      registry.getOrCreate({
        name: 'test2',
        maxConcurrent: 5,
        maxQueueSize: 10,
      });

      expect(registry.getCount()).toBe(2);
    });
  });

  describe('Bulkhead Presets', () => {
    it('should have FAST preset', () => {
      expect(BULKHEAD_PRESETS.FAST.maxConcurrent).toBeGreaterThan(
        BULKHEAD_PRESETS.SLOW.maxConcurrent,
      );
    });

    it('should have SLOW preset', () => {
      expect(BULKHEAD_PRESETS.SLOW.maxConcurrent).toBeLessThan(
        BULKHEAD_PRESETS.NORMAL.maxConcurrent,
      );
    });

    it('should have EXTERNAL_API preset', () => {
      expect(BULKHEAD_PRESETS.EXTERNAL_API).toBeDefined();
    });

    it('should have DATABASE preset', () => {
      expect(BULKHEAD_PRESETS.DATABASE).toBeDefined();
    });

    it('should have ML_OPERATIONS preset', () => {
      expect(BULKHEAD_PRESETS.ML_OPERATIONS.timeout).toBeGreaterThan(60000);
    });

    it('should create bulkhead from presets', () => {
      const bulkhead = new Bulkhead(BULKHEAD_PRESETS.FAST);
      const status = bulkhead.getStatus();

      expect(status.name).toBe('fast');
      expect(status.maxConcurrent).toBe(20);
    });
  });

  describe('Concurrent Operations', () => {
    let bulkhead: Bulkhead;

    beforeEach(() => {
      bulkhead = new Bulkhead({
        name: 'concurrent',
        maxConcurrent: 5,
        maxQueueSize: 20,
      });
    });

    it('should handle high concurrency', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          bulkhead.execute(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return i;
          }),
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
    });

    it('should queue requests when at capacity', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 15; i++) {
        promises.push(
          bulkhead.execute(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return i;
          }),
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(15);
      // Should take at least 500ms (15 ops / 5 concurrent * 50ms each)
      expect(duration).toBeGreaterThan(400);
    });

    it('should measure utilization during load', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          bulkhead.execute(async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }),
        );
      }

      const status = bulkhead.getStatus();
      expect(status.utilizationPercent).toBeGreaterThan(0);

      await Promise.all(promises);
    });
  });
});
