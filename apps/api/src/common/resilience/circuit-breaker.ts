/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping calls to failing services
 */

enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject calls
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before opening (default: 5)
  resetTimeout?: number; // Time before trying again in ms (default: 60s)
  monitoringPeriod?: number; // Period to count failures in ms (default: 60s)
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
}

/**
 * Circuit Breaker Implementation
 * Protects against repeated failures to external services
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly monitoringPeriod: number;
  private readonly onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 60000;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute synchronously with circuit breaker protection
   */
  executeSync<T>(fn: () => T): T {
    if (this.state === CircuitBreakerState.OPEN) {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    try {
      const result = fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.changeState(CircuitBreakerState.CLOSED);
    }
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    
    // Reset failure count if outside monitoring period
    if (now - this.lastFailureTime > this.monitoringPeriod) {
      this.failureCount = 1;
    } else {
      this.failureCount++;
    }
    
    this.lastFailureTime = now;

    // Open circuit if threshold exceeded
    if (this.failureCount >= this.failureThreshold && this.state === CircuitBreakerState.CLOSED) {
      this.changeState(CircuitBreakerState.OPEN);
      this.scheduleReset();
    }
  }

  /**
   * Schedule state change to HALF_OPEN after reset timeout
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.changeState(CircuitBreakerState.HALF_OPEN);
    }, this.resetTimeout);
  }

  /**
   * Change circuit breaker state
   */
  private changeState(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    if (this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.changeState(CircuitBreakerState.CLOSED);
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.changeState(CircuitBreakerState.OPEN);
    this.scheduleReset();
  }

  /**
   * Check if circuit is available
   */
  isAvailable(): boolean {
    return this.state !== CircuitBreakerState.OPEN;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isAvailable: this.isAvailable(),
    };
  }
}

/**
 * Circuit Breaker Registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({
        ...options,
        onStateChange: (from, to) => {
          console.log(`Circuit breaker [${name}] changed from ${from} to ${to}`);
          if (options?.onStateChange) {
            options.onStateChange(from, to);
          }
        },
      });
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all breakers
   */
  getAllBreakers(): Record<string, CircuitBreaker> {
    const result: Record<string, CircuitBreaker> = {};
    for (const [name, breaker] of this.breakers) {
      result[name] = breaker;
    }
    return result;
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Close all breakers
   */
  closeAll(): void {
    this.resetAll();
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
