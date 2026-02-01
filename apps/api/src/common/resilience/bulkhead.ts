import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Bulkhead (compartment) configuration
 * Isolates different types of work to prevent cascading failures
 */
export interface BulkheadConfig {
  name: string;
  maxConcurrent: number;
  maxQueueSize: number;
  timeout?: number;
}

/**
 * Execution context for bulkhead
 */
export interface ExecutionContext {
  id: string;
  startTime: number;
  type: string;
}

/**
 * Bulkhead Pattern Implementation
 * Prevents one resource-consuming operation from affecting others
 */
export class Bulkhead {
  private readonly name: string;
  private readonly maxConcurrent: number;
  private readonly maxQueueSize: number;
  private readonly timeout: number;

  private currentConcurrent = 0;
  private queueSize = 0;
  private rejectedCount = 0;
  private completedCount = 0;
  private totalExecutionTime = 0;

  constructor(config: BulkheadConfig) {
    this.name = config.name;
    this.maxConcurrent = config.maxConcurrent;
    this.maxQueueSize = config.maxQueueSize;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Execute function within bulkhead
   */
  async execute<T>(fn: () => Promise<T>, type: string = 'default'): Promise<T> {
    const context: ExecutionContext = {
      id: this.generateId(),
      startTime: Date.now(),
      type,
    };

    // Check if we can accept this request
    if (this.currentConcurrent >= this.maxConcurrent) {
      // Queue if space available
      if (this.queueSize < this.maxQueueSize) {
        this.queueSize++;

        // Wait for slot
        await this.waitForSlot();
        this.queueSize--;
      } else {
        // Queue full, reject
        this.rejectedCount++;
        throw new HttpException(
          `Bulkhead ${this.name} is at capacity`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    // Increment concurrent count
    this.currentConcurrent++;

    try {
      // Execute with timeout
      return await this.executeWithTimeout(fn, context);
    } finally {
      // Decrement concurrent count
      this.currentConcurrent--;

      // Record execution time
      const duration = Date.now() - context.startTime;
      this.totalExecutionTime += duration;
      this.completedCount++;
    }
  }

  /**
   * Execute function with timeout
   */
  private executeWithTimeout<T>(
    fn: () => Promise<T>,
    context: ExecutionContext,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(
            new HttpException(
              `Bulkhead ${this.name} execution timeout`,
              HttpStatus.REQUEST_TIMEOUT,
            ),
          ),
          this.timeout,
        ),
      ),
    ]);
  }

  /**
   * Wait for available slot
   */
  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.currentConcurrent < this.maxConcurrent) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };

      checkSlot();
    });
  }

  /**
   * Get bulkhead status
   */
  getStatus() {
    return {
      name: this.name,
      maxConcurrent: this.maxConcurrent,
      currentConcurrent: this.currentConcurrent,
      queueSize: this.queueSize,
      maxQueueSize: this.maxQueueSize,
      rejectedCount: this.rejectedCount,
      completedCount: this.completedCount,
      avgExecutionTime:
        this.completedCount > 0 ? this.totalExecutionTime / this.completedCount : 0,
      utilizationPercent: Math.round((this.currentConcurrent / this.maxConcurrent) * 100),
    };
  }

  /**
   * Check if bulkhead is healthy
   */
  isHealthy(): boolean {
    // Reject if queue is >80% full
    const queueUsagePercent = (this.queueSize / this.maxQueueSize) * 100;
    return queueUsagePercent < 80;
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.rejectedCount = 0;
    this.completedCount = 0;
    this.totalExecutionTime = 0;
  }

  /**
   * Generate unique ID for context
   */
  private generateId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Bulkhead registry for managing multiple bulkheads
 */
export class BulkheadRegistry {
  private bulkheads: Map<string, Bulkhead> = new Map();

  /**
   * Create or get bulkhead
   */
  getOrCreate(config: BulkheadConfig): Bulkhead {
    if (!this.bulkheads.has(config.name)) {
      this.bulkheads.set(config.name, new Bulkhead(config));
    }

    return this.bulkheads.get(config.name)!;
  }

  /**
   * Get bulkhead by name
   */
  get(name: string): Bulkhead | undefined {
    return this.bulkheads.get(name);
  }

  /**
   * Execute within bulkhead
   */
  async execute<T>(
    bulkheadName: string,
    fn: () => Promise<T>,
    type?: string,
  ): Promise<T> {
    const bulkhead = this.bulkheads.get(bulkheadName);

    if (!bulkhead) {
      throw new HttpException(
        `Bulkhead ${bulkheadName} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return bulkhead.execute(fn, type);
  }

  /**
   * Get all bulkhead statuses
   */
  getAllStatus() {
    const statuses: Record<string, any> = {};

    for (const [name, bulkhead] of this.bulkheads) {
      statuses[name] = bulkhead.getStatus();
    }

    return statuses;
  }

  /**
   * Check all bulkheads health
   */
  getHealthStatus() {
    const statuses: Record<string, any> = {};

    for (const [name, bulkhead] of this.bulkheads) {
      statuses[name] = {
        healthy: bulkhead.isHealthy(),
        ...bulkhead.getStatus(),
      };
    }

    return statuses;
  }

  /**
   * Reset all statistics
   */
  resetAll(): void {
    for (const bulkhead of this.bulkheads.values()) {
      bulkhead.reset();
    }
  }

  /**
   * Get bulkhead count
   */
  getCount(): number {
    return this.bulkheads.size;
  }
}

/**
 * Common bulkhead configurations
 */
export const BULKHEAD_PRESETS = {
  // Fast operations - high concurrency, small queue
  FAST: {
    name: 'fast',
    maxConcurrent: 20,
    maxQueueSize: 50,
    timeout: 5000,
  },

  // Normal operations - moderate concurrency
  NORMAL: {
    name: 'normal',
    maxConcurrent: 10,
    maxQueueSize: 100,
    timeout: 30000,
  },

  // Slow operations - low concurrency, large queue
  SLOW: {
    name: 'slow',
    maxConcurrent: 5,
    maxQueueSize: 200,
    timeout: 60000,
  },

  // External API - balanced
  EXTERNAL_API: {
    name: 'external-api',
    maxConcurrent: 8,
    maxQueueSize: 150,
    timeout: 15000,
  },

  // Database - conservative
  DATABASE: {
    name: 'database',
    maxConcurrent: 15,
    maxQueueSize: 300,
    timeout: 30000,
  },

  // ML Operations - limited
  ML_OPERATIONS: {
    name: 'ml-ops',
    maxConcurrent: 3,
    maxQueueSize: 50,
    timeout: 120000,
  },
};

/**
 * Bulkhead decorator
 */
export function WithBulkhead(bulkheadName: string, type?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const registry = new BulkheadRegistry();

    descriptor.value = async function (...args: any[]) {
      let bulkhead = registry.get(bulkheadName);

      if (!bulkhead) {
        // Auto-create with default config
        bulkhead = registry.getOrCreate({
          name: bulkheadName,
          maxConcurrent: 10,
          maxQueueSize: 100,
        });
      }

      return bulkhead.execute(() => originalMethod.apply(this, args), type);
    };

    return descriptor;
  };
}
