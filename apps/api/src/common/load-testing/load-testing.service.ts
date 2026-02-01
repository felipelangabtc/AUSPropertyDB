import { Injectable, Logger } from '@nestjs/common';

/**
 * Load Test Configuration
 */
export interface LoadTestConfig {
  name: string;
  description: string;
  testType: 'spike' | 'soak' | 'stress' | 'ramp' | 'endurance';
  duration: number; // seconds
  rampTime: number; // seconds
  peakLoad: number; // concurrent users
  stepLoad: number; // users to add per step
  endpoints: TestEndpoint[];
  thinkTime: number; // ms between requests
  timeout: number; // ms
  successCriteria: SuccessCriteria;
}

/**
 * Test Endpoint
 */
export interface TestEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  weight: number; // percentage of traffic
  payload?: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * Success Criteria
 */
export interface SuccessCriteria {
  p95Latency: number; // ms
  p99Latency: number; // ms
  errorRate: number; // percentage
  throughput: number; // requests/sec
}

/**
 * Load Test Result
 */
export interface LoadTestResult {
  testId: string;
  testName: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number; // percentage
  throughput: number; // requests/sec
  latency: LatencyStats;
  errors: ErrorStats[];
  peakLoad: number;
  bottlenecks: string[];
  recommendations: string[];
  passedCriteria: boolean;
}

/**
 * Latency Statistics
 */
export interface LatencyStats {
  min: number; // ms
  max: number; // ms
  avg: number; // ms
  p50: number; // ms
  p95: number; // ms
  p99: number; // ms
  stdDev: number;
}

/**
 * Error Statistics
 */
export interface ErrorStats {
  code: number;
  message: string;
  count: number;
  percentage: number;
}

/**
 * Load Testing Service
 *
 * Provides comprehensive load testing capabilities:
 * - Spike testing (sudden load increase)
 * - Soak testing (sustained load)
 * - Stress testing (beyond capacity)
 * - Ramp testing (gradual load increase)
 * - Endurance testing (long-duration)
 * - Capacity planning
 * - Bottleneck identification
 */
@Injectable()
export class LoadTestingService {
  private logger = new Logger(LoadTestingService.name);
  private testResults: LoadTestResult[] = [];
  private activeTest: LoadTestResult | null = null;

  /**
   * Default test configurations
   */
  private readonly DEFAULT_CONFIGS: Record<string, Partial<LoadTestConfig>> = {
    smoke: {
      testType: 'ramp',
      duration: 60,
      rampTime: 10,
      peakLoad: 10,
      stepLoad: 5,
      thinkTime: 100,
      timeout: 5000,
      successCriteria: {
        p95Latency: 200,
        p99Latency: 500,
        errorRate: 1,
        throughput: 100,
      },
    },
    load: {
      testType: 'ramp',
      duration: 300,
      rampTime: 60,
      peakLoad: 100,
      stepLoad: 20,
      thinkTime: 50,
      timeout: 10000,
      successCriteria: {
        p95Latency: 500,
        p99Latency: 1000,
        errorRate: 0.5,
        throughput: 500,
      },
    },
    spike: {
      testType: 'spike',
      duration: 120,
      rampTime: 0,
      peakLoad: 500,
      stepLoad: 500,
      thinkTime: 10,
      timeout: 15000,
      successCriteria: {
        p95Latency: 1000,
        p99Latency: 2000,
        errorRate: 2,
        throughput: 1000,
      },
    },
    stress: {
      testType: 'stress',
      duration: 600,
      rampTime: 120,
      peakLoad: 1000,
      stepLoad: 50,
      thinkTime: 5,
      timeout: 20000,
      successCriteria: {
        p95Latency: 2000,
        p99Latency: 5000,
        errorRate: 5,
        throughput: 2000,
      },
    },
    endurance: {
      testType: 'endurance',
      duration: 3600, // 1 hour
      rampTime: 300,
      peakLoad: 200,
      stepLoad: 20,
      thinkTime: 100,
      timeout: 10000,
      successCriteria: {
        p95Latency: 500,
        p99Latency: 1000,
        errorRate: 0.5,
        throughput: 1000,
      },
    },
  };

  /**
   * Standard test endpoints
   */
  private readonly DEFAULT_ENDPOINTS: TestEndpoint[] = [
    {
      name: 'List Properties',
      method: 'GET',
      path: '/api/properties?limit=10',
      weight: 40,
    },
    {
      name: 'Search Properties',
      method: 'GET',
      path: '/api/properties/search?q=Sydney',
      weight: 30,
    },
    {
      name: 'Get Property Details',
      method: 'GET',
      path: '/api/properties/123',
      weight: 20,
    },
    {
      name: 'Create Alert',
      method: 'POST',
      path: '/api/alerts',
      weight: 10,
      payload: {
        suburb: 'Sydney',
        minPrice: 500000,
        maxPrice: 1000000,
        propertyType: 'house',
      },
    },
  ];

  /**
   * Run load test
   */
  async runLoadTest(
    config: LoadTestConfig,
    endpoints: TestEndpoint[] = this.DEFAULT_ENDPOINTS
  ): Promise<LoadTestResult> {
    if (this.activeTest) {
      throw new Error('Test already in progress');
    }

    this.logger.log(`Starting load test: ${config.name}`);

    const result: LoadTestResult = {
      testId: `load-test-${Date.now()}`,
      testName: config.name,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errorRate: 0,
      throughput: 0,
      latency: {
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        stdDev: 0,
      },
      errors: [],
      peakLoad: config.peakLoad,
      bottlenecks: [],
      recommendations: [],
      passedCriteria: false,
    };

    this.activeTest = result;

    try {
      // Simulate load test execution
      await this.simulateLoadTest(config, result, endpoints);

      // Analyze results
      this.analyzeResults(result, config);

      // Identify bottlenecks
      this.identifyBottlenecks(result, endpoints);

      // Generate recommendations
      this.generateRecommendations(result, config);

      result.passedCriteria = this.checkSuccessCriteria(result, config.successCriteria);

      this.logger.log(`Load test completed: ${result.testName}`);
      this.logger.log(
        `Results: ${result.totalRequests} requests, ${result.errorRate}% errors, ${result.throughput} req/s`
      );

      this.testResults.push(result);
      return result;
    } finally {
      this.activeTest = null;
    }
  }

  /**
   * Simulate load test execution
   */
  private async simulateLoadTest(
    config: LoadTestConfig,
    result: LoadTestResult,
    endpoints: TestEndpoint[]
  ): Promise<void> {
    const startTime = Date.now();
    const latencies: number[] = [];
    const errorMap = new Map<number, ErrorStats>();

    // Simulate ramping up load
    const step = Math.ceil(config.duration / (config.rampTime || 1));
    let currentLoad = 0;

    for (let i = 0; i < config.duration; i += step) {
      // Ramp up load
      currentLoad = Math.min(config.peakLoad, currentLoad + config.stepLoad);

      // Generate requests
      for (let j = 0; j < currentLoad; j++) {
        // Simulate request
        const endpoint = this.selectEndpoint(endpoints);
        const latency = this.simulateRequest(endpoint);
        latencies.push(latency);
        result.totalRequests++;

        // Simulate errors (1% baseline + more under heavy load)
        const errorRate = 0.01 + (currentLoad / config.peakLoad) * 0.04;
        if (Math.random() < errorRate) {
          result.failedRequests++;
          const code = Math.random() > 0.8 ? 503 : 500;
          const key = String(code);

          if (!errorMap.has(code)) {
            errorMap.set(code, {
              code,
              message: code === 503 ? 'Service Unavailable' : 'Internal Server Error',
              count: 0,
              percentage: 0,
            });
          }

          const errorStat = errorMap.get(code)!;
          errorStat.count++;
        } else {
          result.successfulRequests++;
        }

        // Think time
        await this.delay(config.thinkTime || 50);
      }
    }

    result.endTime = new Date();
    result.duration = (result.endTime.getTime() - startTime) / 1000;
    result.throughput = result.totalRequests / result.duration;
    result.errorRate = (result.failedRequests / result.totalRequests) * 100;

    // Calculate latency statistics
    result.latency = this.calculateLatencyStats(latencies);

    // Convert error map to array
    result.errors = Array.from(errorMap.values()).map((e) => ({
      ...e,
      percentage: (e.count / result.totalRequests) * 100,
    }));
  }

  /**
   * Select endpoint based on weight
   */
  private selectEndpoint(endpoints: TestEndpoint[]): TestEndpoint {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const endpoint of endpoints) {
      cumulative += endpoint.weight;
      if (rand <= cumulative) {
        return endpoint;
      }
    }

    return endpoints[0];
  }

  /**
   * Simulate request execution
   */
  private simulateRequest(endpoint: TestEndpoint): number {
    // Simulate latency: 50-200ms base + random spike
    const base = 50 + Math.random() * 150;
    const spike = Math.random() > 0.95 ? Math.random() * 500 : 0;
    return Math.round(base + spike);
  }

  /**
   * Calculate latency statistics
   */
  private calculateLatencyStats(latencies: number[]): LatencyStats {
    const sorted = latencies.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const variance = sorted.reduce((a, l) => a + Math.pow(l - avg, 2), 0) / sorted.length;

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(avg),
      p50: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
      p99: Math.round(sorted[Math.floor(sorted.length * 0.99)]),
      stdDev: Math.round(Math.sqrt(variance)),
    };
  }

  /**
   * Analyze test results
   */
  private analyzeResults(result: LoadTestResult, config: LoadTestConfig): void {
    // Analysis happens during simulation
  }

  /**
   * Identify bottlenecks
   */
  private identifyBottlenecks(result: LoadTestResult, endpoints: TestEndpoint[]): void {
    const bottlenecks: string[] = [];

    // High latency
    if (result.latency.p95 > 500) {
      bottlenecks.push('High latency detected (P95 > 500ms)');
    }

    // High error rate
    if (result.errorRate > 1) {
      bottlenecks.push(`High error rate (${result.errorRate.toFixed(2)}%)`);
    }

    // Memory pressure
    if (result.latency.stdDev > result.latency.avg) {
      bottlenecks.push('Inconsistent response times - possible memory pressure');
    }

    result.bottlenecks = bottlenecks;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(result: LoadTestResult, config: LoadTestConfig): void {
    const recommendations: string[] = [];

    if (result.latency.p95 > 500) {
      recommendations.push('✓ Optimize database queries');
      recommendations.push('✓ Increase database connection pool');
      recommendations.push('✓ Implement caching strategy');
    }

    if (result.errorRate > 1) {
      recommendations.push('✓ Implement circuit breaker pattern');
      recommendations.push('✓ Add request queuing');
      recommendations.push('✓ Scale horizontally');
    }

    if (result.throughput < config.successCriteria.throughput * 0.8) {
      recommendations.push('✓ Increase server resources');
      recommendations.push('✓ Optimize API endpoints');
      recommendations.push('✓ Add load balancer');
    }

    result.recommendations = recommendations;
  }

  /**
   * Check success criteria
   */
  private checkSuccessCriteria(result: LoadTestResult, criteria: SuccessCriteria): boolean {
    return (
      result.latency.p95 <= criteria.p95Latency &&
      result.latency.p99 <= criteria.p99Latency &&
      result.errorRate <= criteria.errorRate &&
      result.throughput >= criteria.throughput
    );
  }

  /**
   * Get test results
   */
  getTestResults(): LoadTestResult[] {
    return this.testResults;
  }

  /**
   * Get last test result
   */
  getLastTestResult(): LoadTestResult | undefined {
    return this.testResults[this.testResults.length - 1];
  }

  /**
   * Compare test results
   */
  compareResults(testId1: string, testId2: string) {
    const result1 = this.testResults.find((r) => r.testId === testId1);
    const result2 = this.testResults.find((r) => r.testId === testId2);

    if (!result1 || !result2) {
      return null;
    }

    return {
      throughputChange: (
        ((result2.throughput - result1.throughput) / result1.throughput) *
        100
      ).toFixed(2),
      latencyChange: (
        ((result2.latency.p95 - result1.latency.p95) / result1.latency.p95) *
        100
      ).toFixed(2),
      errorRateChange: (result2.errorRate - result1.errorRate).toFixed(2),
    };
  }

  /**
   * Get predefined test configuration
   */
  getDefaultConfig(testType: string): Partial<LoadTestConfig> | null {
    return this.DEFAULT_CONFIGS[testType] || null;
  }

  /**
   * Capacity planning based on test results
   */
  getCapacityPlanning(result: LoadTestResult): Record<string, any> {
    return {
      currentCapacity: result.peakLoad,
      recommendedCapacity: Math.ceil(result.peakLoad * 1.5),
      growthRate: '20% YoY',
      recommendedInfra: this.recommendInfrastructure(result),
    };
  }

  /**
   * Recommend infrastructure based on results
   */
  private recommendInfrastructure(result: LoadTestResult) {
    if (result.peakLoad <= 100) {
      return {
        apiServers: 3,
        dbServers: 2,
        cacheServers: 1,
        loadBalancers: 1,
      };
    } else if (result.peakLoad <= 500) {
      return {
        apiServers: 10,
        dbServers: 3,
        cacheServers: 2,
        loadBalancers: 2,
      };
    } else {
      return {
        apiServers: 20,
        dbServers: 5,
        cacheServers: 3,
        loadBalancers: 3,
      };
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
