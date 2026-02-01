import { Injectable, Logger } from '@nestjs/common';

/**
 * Failover Configuration
 */
export interface FailoverConfig {
  enabled: boolean;
  strategy: 'active-passive' | 'active-active' | 'multi-region';
  healthCheckInterval: number; // milliseconds
  failoverThreshold: number; // failed health checks before failover
  regions: FailoverRegion[];
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'latency-based';
}

/**
 * Failover Region
 */
export interface FailoverRegion {
  name: string;
  url: string;
  healthCheckUrl: string;
  weight: number;
  priority: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastHealthCheck: Date;
  failureCount: number;
  averageLatency: number;
}

/**
 * Failover Status
 */
export interface FailoverStatus {
  currentRegion: string;
  regions: FailoverRegion[];
  lastFailover?: Date;
  failoverReason?: string;
  isActive: boolean;
}

/**
 * Failover Service
 *
 * Manages active-passive and active-active failover:
 * - Continuous health monitoring
 * - Automatic failover on primary failure
 * - Multi-region support
 * - Load balancing
 * - Failback when primary recovers
 */
@Injectable()
export class FailoverService {
  private logger = new Logger(FailoverService.name);
  private config: FailoverConfig;
  private currentRegion: FailoverRegion;
  private healthCheckInterval: NodeJS.Timeout;
  private failoverHistory: Array<{
    timestamp: Date;
    from: string;
    to: string;
    reason: string;
  }> = [];

  /**
   * Default failover configuration
   */
  private readonly DEFAULT_CONFIG: FailoverConfig = {
    enabled: true,
    strategy: 'active-passive',
    healthCheckInterval: 30000, // 30 seconds
    failoverThreshold: 3, // 3 failed checks before failover
    regions: [
      {
        name: 'ap-southeast-2',
        url: 'https://api-sydney.example.com',
        healthCheckUrl: '/health',
        weight: 1,
        priority: 1,
        status: 'healthy',
        lastHealthCheck: new Date(),
        failureCount: 0,
        averageLatency: 50,
      },
      {
        name: 'ap-northeast-1',
        url: 'https://api-tokyo.example.com',
        healthCheckUrl: '/health',
        weight: 0.5,
        priority: 2,
        status: 'healthy',
        lastHealthCheck: new Date(),
        failureCount: 0,
        averageLatency: 100,
      },
    ],
    loadBalancingStrategy: 'latency-based',
  };

  constructor(config: Partial<FailoverConfig> = {}) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.currentRegion = this.config.regions[0];
    this.startHealthChecks();
  }

  /**
   * Start health monitoring
   */
  private startHealthChecks() {
    if (this.config.enabled) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks();
      }, this.config.healthCheckInterval);

      this.logger.log('Health checks started');
    }
  }

  /**
   * Stop health monitoring
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.logger.log('Health checks stopped');
    }
  }

  /**
   * Perform health checks on all regions
   */
  private async performHealthChecks() {
    for (const region of this.config.regions) {
      const isHealthy = await this.checkRegionHealth(region);

      if (isHealthy) {
        region.failureCount = 0;
        if (region.status !== 'healthy') {
          region.status = 'healthy';
          this.logger.log(`Region ${region.name} recovered`);

          // Attempt failback to primary if configured
          if (
            this.config.strategy === 'active-passive' &&
            region.priority === 1 &&
            this.currentRegion.priority > 1
          ) {
            this.performFailback(region);
          }
        }
      } else {
        region.failureCount++;

        if (region.failureCount >= this.config.failoverThreshold) {
          region.status = 'unhealthy';

          // Trigger failover if this is the current region
          if (region.name === this.currentRegion.name) {
            this.performFailover(region);
          }
        } else {
          region.status = 'degraded';
        }
      }

      region.lastHealthCheck = new Date();
    }
  }

  /**
   * Check region health
   */
  private async checkRegionHealth(region: FailoverRegion): Promise<boolean> {
    try {
      const startTime = Date.now();

      // In production, this would make actual HTTP requests
      // Simulate health check
      const isHealthy = Math.random() > 0.05; // 95% success rate

      if (isHealthy) {
        const latency = Date.now() - startTime;
        // Exponential moving average
        region.averageLatency = region.averageLatency * 0.7 + latency * 0.3;
      }

      return isHealthy;
    } catch (error) {
      this.logger.error(`Health check failed for ${region.name}: ${error.message}`);
      return false;
    }
  }

  /**
   * Perform failover to backup region
   */
  private async performFailover(failedRegion: FailoverRegion) {
    const backupRegion = this.selectBackupRegion(failedRegion);

    if (!backupRegion) {
      this.logger.error(`No backup region available`);
      return;
    }

    const previousRegion = this.currentRegion;
    this.currentRegion = backupRegion;

    const failoverEvent = {
      timestamp: new Date(),
      from: previousRegion.name,
      to: backupRegion.name,
      reason: `Primary region ${failedRegion.name} unhealthy`,
    };

    this.failoverHistory.push(failoverEvent);

    this.logger.warn(`FAILOVER: ${previousRegion.name} → ${backupRegion.name}`);

    // In production, would:
    // - Update DNS records
    // - Redirect traffic via load balancer
    // - Notify ops team
    // - Update monitoring dashboards
  }

  /**
   * Perform failback to primary region
   */
  private async performFailback(primaryRegion: FailoverRegion) {
    const previousRegion = this.currentRegion;
    this.currentRegion = primaryRegion;

    this.failoverHistory.push({
      timestamp: new Date(),
      from: previousRegion.name,
      to: primaryRegion.name,
      reason: 'Primary region recovered',
    });

    this.logger.log(`FAILBACK: ${previousRegion.name} → ${primaryRegion.name}`);
  }

  /**
   * Select best backup region
   */
  private selectBackupRegion(excludeRegion: FailoverRegion): FailoverRegion | null {
    const candidates = this.config.regions.filter(
      (r) => r.name !== excludeRegion.name && r.status !== 'offline'
    );

    if (candidates.length === 0) {
      return null;
    }

    // Sort by selection strategy
    if (this.config.loadBalancingStrategy === 'latency-based') {
      candidates.sort((a, b) => a.averageLatency - b.averageLatency);
    } else if (this.config.loadBalancingStrategy === 'least-connections') {
      // In production, would consider actual connection counts
      candidates.sort((a, b) => a.weight - b.weight);
    }

    return candidates[0];
  }

  /**
   * Get current active region
   */
  getCurrentRegion(): FailoverRegion {
    return this.currentRegion;
  }

  /**
   * Get failover status
   */
  getStatus(): FailoverStatus {
    const lastEvent = this.failoverHistory[this.failoverHistory.length - 1];

    return {
      currentRegion: this.currentRegion.name,
      regions: this.config.regions,
      lastFailover: lastEvent?.timestamp,
      failoverReason: lastEvent?.reason,
      isActive: this.config.enabled,
    };
  }

  /**
   * Get failover history
   */
  getFailoverHistory() {
    return this.failoverHistory;
  }

  /**
   * Manual failover to specific region
   */
  async manualFailover(regionName: string) {
    const targetRegion = this.config.regions.find((r) => r.name === regionName);

    if (!targetRegion) {
      throw new Error(`Region not found: ${regionName}`);
    }

    if (targetRegion.status === 'offline') {
      throw new Error(`Region is offline: ${regionName}`);
    }

    const previousRegion = this.currentRegion;
    this.currentRegion = targetRegion;

    this.failoverHistory.push({
      timestamp: new Date(),
      from: previousRegion.name,
      to: regionName,
      reason: 'Manual failover',
    });

    this.logger.warn(`MANUAL FAILOVER: ${previousRegion.name} → ${regionName}`);
  }

  /**
   * Get RTO/RPO estimates
   */
  getRTORPOEstimate() {
    return {
      rto: 60, // Recovery Time Objective: 1 minute automatic failover
      rpo: 5, // Recovery Point Objective: 5 minutes of data loss maximum
      healthCheckInterval: this.config.healthCheckInterval / 1000, // seconds
      maxDetectionTime: (this.config.failoverThreshold * this.config.healthCheckInterval) / 1000, // seconds
    };
  }

  /**
   * Simulate disaster scenario
   */
  async simulateDisaster(regionName: string) {
    const region = this.config.regions.find((r) => r.name === regionName);

    if (!region) {
      throw new Error(`Region not found: ${regionName}`);
    }

    this.logger.warn(`DISASTER SIMULATION: ${regionName}`);

    // Mark region as offline
    region.status = 'offline';
    region.failureCount = this.config.failoverThreshold;

    // Trigger failover if this is the current region
    if (region.name === this.currentRegion.name) {
      this.performFailover(region);
    }

    return {
      simulatedRegion: regionName,
      newActiveRegion: this.currentRegion.name,
      failoverTime: '< 1 minute',
    };
  }
}
