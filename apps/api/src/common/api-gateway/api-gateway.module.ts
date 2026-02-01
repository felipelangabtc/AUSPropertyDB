import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KongGatewayService } from './kong.gateway';
import { TraefikGatewayService } from './traefik.gateway';
import { AdvancedRateLimiterService } from './advanced-rate-limiter';
import { ApiGatewayController } from './api-gateway.controller';

@Module({
  imports: [ConfigModule],
  providers: [KongGatewayService, TraefikGatewayService, AdvancedRateLimiterService],
  controllers: [ApiGatewayController],
  exports: [KongGatewayService, TraefikGatewayService, AdvancedRateLimiterService],
})
export class ApiGatewayModule {}
