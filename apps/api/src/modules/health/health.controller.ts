import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get('/health')
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('/health/db')
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  async checkDatabase(@Res() res: Response) {
    const result = await this.healthService.checkDatabase();
    const status = result.healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  @Get('/health/redis')
  @ApiOperation({ summary: 'Redis health check' })
  @ApiResponse({ status: 200, description: 'Redis is healthy' })
  async checkRedis(@Res() res: Response) {
    const result = await this.healthService.checkRedis();
    const status = result.healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  @Get('/health/connectors')
  @ApiOperation({ summary: 'Check connector health' })
  @ApiResponse({ status: 200, description: 'Connectors are healthy' })
  async checkConnectors(@Res() res: Response) {
    const result = await this.healthService.checkConnectors();
    const status = result.healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }
}
