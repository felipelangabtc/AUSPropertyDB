import { Test, TestingModule } from '@nestjs/testing';
import { LoadTestingService, LoadTestConfig } from '../load-testing.service';

describe('Load Testing - Phase 4.8', () => {
  let module: TestingModule;
  let loadTestingService: LoadTestingService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [LoadTestingService],
    }).compile();

    loadTestingService = module.get<LoadTestingService>(LoadTestingService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Load Testing Service', () => {
    it('should run smoke test', async () => {
      const config: LoadTestConfig = {
        name: 'Smoke Test',
        description: 'Basic functionality test',
        testType: 'ramp',
        duration: 30,
        rampTime: 5,
        peakLoad: 10,
        stepLoad: 5,
        thinkTime: 100,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.testName).toBe('Smoke Test');
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    it('should run load test', async () => {
      const config: LoadTestConfig = {
        name: 'Load Test',
        description: 'Standard load testing',
        testType: 'ramp',
        duration: 30,
        rampTime: 10,
        peakLoad: 50,
        stepLoad: 10,
        thinkTime: 50,
        timeout: 10000,
        endpoints: [],
        successCriteria: {
          p95Latency: 500,
          p99Latency: 1000,
          errorRate: 0.5,
          throughput: 500,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.peakLoad).toBe(50);
      expect(result.latency.p95).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThanOrEqual(0);
    });

    it('should run spike test', async () => {
      const config: LoadTestConfig = {
        name: 'Spike Test',
        description: 'Sudden load increase',
        testType: 'spike',
        duration: 30,
        rampTime: 0,
        peakLoad: 200,
        stepLoad: 200,
        thinkTime: 10,
        timeout: 15000,
        endpoints: [],
        successCriteria: {
          p95Latency: 1000,
          p99Latency: 2000,
          errorRate: 2,
          throughput: 1000,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.testType).toBe('spike');
      expect(result.peakLoad).toBe(200);
    });

    it('should track test results', async () => {
      const config: LoadTestConfig = {
        name: 'Track Test',
        description: 'Test result tracking',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result1 = await loadTestingService.runLoadTest(config);
      const results = loadTestingService.getTestResults();

      expect(results.length).toBeGreaterThan(0);
      expect(results[results.length - 1].testId).toBe(result1.testId);
    });

    it('should calculate latency statistics', async () => {
      const config: LoadTestConfig = {
        name: 'Latency Test',
        description: 'Latency statistics',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.latency.min).toBeGreaterThan(0);
      expect(result.latency.max).toBeGreaterThanOrEqual(result.latency.min);
      expect(result.latency.avg).toBeGreaterThan(0);
      expect(result.latency.p50).toBeGreaterThan(0);
      expect(result.latency.p95).toBeGreaterThan(result.latency.p50);
      expect(result.latency.p99).toBeGreaterThanOrEqual(result.latency.p95);
      expect(result.latency.stdDev).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate error rate', async () => {
      const config: LoadTestConfig = {
        name: 'Error Test',
        description: 'Error rate evaluation',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 30,
        stepLoad: 5,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.errorRate).toBeLessThanOrEqual(100);
      expect(result.failedRequests + result.successfulRequests).toBe(result.totalRequests);
    });

    it('should calculate throughput', async () => {
      const config: LoadTestConfig = {
        name: 'Throughput Test',
        description: 'Throughput calculation',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(result.throughput).toBeGreaterThan(0);
      // throughput = totalRequests / duration
      expect(result.throughput).toBeLessThanOrEqual(result.totalRequests / result.duration);
    });

    it('should validate success criteria', async () => {
      const config: LoadTestConfig = {
        name: 'Criteria Test',
        description: 'Success criteria validation',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 100,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 2000,
          p99Latency: 5000,
          errorRate: 5,
          throughput: 50,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(typeof result.passedCriteria).toBe('boolean');
    });

    it('should identify bottlenecks', async () => {
      const config: LoadTestConfig = {
        name: 'Bottleneck Test',
        description: 'Bottleneck identification',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(Array.isArray(result.bottlenecks)).toBe(true);
    });

    it('should generate recommendations', async () => {
      const config: LoadTestConfig = {
        name: 'Recommendation Test',
        description: 'Recommendation generation',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide capacity planning', async () => {
      const config: LoadTestConfig = {
        name: 'Capacity Test',
        description: 'Capacity planning',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 100,
        stepLoad: 10,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 500,
          p99Latency: 1000,
          errorRate: 0.5,
          throughput: 500,
        },
      };

      const result = await loadTestingService.runLoadTest(config);
      const capacity = loadTestingService.getCapacityPlanning(result);

      expect(capacity.currentCapacity).toBe(100);
      expect(capacity.recommendedCapacity).toBeGreaterThan(100);
      expect(capacity.recommendedInfra).toBeDefined();
    });

    it('should get predefined test configurations', () => {
      const smokeConfig = loadTestingService.getDefaultConfig('smoke');
      const loadConfig = loadTestingService.getDefaultConfig('load');
      const spikeConfig = loadTestingService.getDefaultConfig('spike');
      const stressConfig = loadTestingService.getDefaultConfig('stress');
      const enduranceConfig = loadTestingService.getDefaultConfig('endurance');

      expect(smokeConfig).toBeDefined();
      expect(loadConfig).toBeDefined();
      expect(spikeConfig).toBeDefined();
      expect(stressConfig).toBeDefined();
      expect(enduranceConfig).toBeDefined();
    });

    it('should compare test results', async () => {
      const config1: LoadTestConfig = {
        name: 'Compare Test 1',
        description: 'Comparison test 1',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 100,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result1 = await loadTestingService.runLoadTest(config1);

      const config2: LoadTestConfig = {
        name: 'Compare Test 2',
        description: 'Comparison test 2',
        testType: 'ramp',
        duration: 10,
        rampTime: 5,
        peakLoad: 20,
        stepLoad: 5,
        thinkTime: 50,
        timeout: 5000,
        endpoints: [],
        successCriteria: {
          p95Latency: 200,
          p99Latency: 500,
          errorRate: 1,
          throughput: 100,
        },
      };

      const result2 = await loadTestingService.runLoadTest(config2);

      const comparison = loadTestingService.compareResults(result1.testId, result2.testId);

      expect(comparison).toBeDefined();
      expect(comparison?.throughputChange).toBeDefined();
      expect(comparison?.latencyChange).toBeDefined();
      expect(comparison?.errorRateChange).toBeDefined();
    });
  });

  describe('Performance Standards', () => {
    it('should meet API latency targets', async () => {
      const config: LoadTestConfig = {
        name: 'Latency Target Test',
        description: 'API latency standards',
        testType: 'ramp',
        duration: 20,
        rampTime: 10,
        peakLoad: 50,
        stepLoad: 10,
        thinkTime: 50,
        timeout: 10000,
        endpoints: [],
        successCriteria: {
          p95Latency: 500,
          p99Latency: 1000,
          errorRate: 0.5,
          throughput: 500,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      // P95 should be under target
      expect(result.latency.p95).toBeLessThan(1000);
    });

    it('should maintain error rate under load', async () => {
      const config: LoadTestConfig = {
        name: 'Error Rate Test',
        description: 'Error rate under load',
        testType: 'ramp',
        duration: 20,
        rampTime: 10,
        peakLoad: 50,
        stepLoad: 10,
        thinkTime: 50,
        timeout: 10000,
        endpoints: [],
        successCriteria: {
          p95Latency: 500,
          p99Latency: 1000,
          errorRate: 1,
          throughput: 500,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      // Error rate should be low
      expect(result.errorRate).toBeLessThan(5);
    });

    it('should achieve target throughput', async () => {
      const config: LoadTestConfig = {
        name: 'Throughput Target Test',
        description: 'Throughput standards',
        testType: 'ramp',
        duration: 20,
        rampTime: 10,
        peakLoad: 50,
        stepLoad: 10,
        thinkTime: 50,
        timeout: 10000,
        endpoints: [],
        successCriteria: {
          p95Latency: 500,
          p99Latency: 1000,
          errorRate: 0.5,
          throughput: 500,
        },
      };

      const result = await loadTestingService.runLoadTest(config);

      // Should achieve at least 80% of target
      expect(result.throughput).toBeGreaterThan(500 * 0.8);
    });
  });
});
