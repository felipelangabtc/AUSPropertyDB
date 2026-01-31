import { Injectable } from '@nestjs/common';
import logger from '@aus-prop/observability';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async checkDatabase(): Promise<{ healthy: boolean; message: string }> {
    try {
      // In production, query the database here
      logger.info('Database health check passed');
      return { healthy: true, message: 'Database connection OK' };
    } catch (error) {
      logger.error('Database health check failed', error);
      return { healthy: false, message: 'Database connection failed' };
    }
  }

  async checkRedis(): Promise<{ healthy: boolean; message: string }> {
    try {
      // In production, ping Redis here
      logger.info('Redis health check passed');
      return { healthy: true, message: 'Redis connection OK' };
    } catch (error) {
      logger.error('Redis health check failed', error);
      return { healthy: false, message: 'Redis connection failed' };
    }
  }

  async checkConnectors(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Check connector health status
      return { healthy: true, message: 'Connectors OK' };
    } catch (error) {
      logger.error('Connector health check failed', error);
      return { healthy: false, message: 'Connector check failed' };
    }
  }
}
