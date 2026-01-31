import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';

describe('Health Module (e2e)', () => {
  let app: INestApplication;
  let healthService: HealthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    healthService = moduleFixture.get<HealthService>(HealthService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const result = await healthService.getHealth();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(['ok', 'degraded', 'down']).toContain(result.status);
    });
  });

  describe('GET /health/db', () => {
    it('should return database health', async () => {
      const result = await healthService.getHealthDb();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('connected');
    });
  });

  describe('GET /health/redis', () => {
    it('should return redis health', async () => {
      const result = await healthService.getHealthRedis();
      expect(result).toHaveProperty('status');
    });
  });

  describe('GET /health/connectors', () => {
    it('should return connectors health', async () => {
      const result = await healthService.getHealthConnectors();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('connectors');
      expect(Array.isArray(result.connectors)).toBe(true);
    });
  });
});
