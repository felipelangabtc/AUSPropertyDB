import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import * as redisStore from 'cache-manager-redis-store';
import { HealthModule } from './modules/health/health.module';
import { PropertyModule } from './modules/property/property.module';
import { SearchModule } from './modules/search/search.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MlModule } from './modules/ml/ml.module';
import { BullModule as BullModuleRegister } from '@nestjs/bull';
import { HttpMetricsMiddleware } from './common/middleware/http-metrics.middleware';
import { ResilienceMiddleware } from './common/resilience/resilience.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    CacheModule.register({
      isGlobal: true,
      store: redisStore as any,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ttl: 5 * 60, // 5 minutes
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    // Register queues used by the API (webhooks delivery)
    BullModuleRegister.registerQueue({ name: 'webhooks' }),
    HealthModule,
    AuthModule,
    UserModule,
    PropertyModule,
    SearchModule,
    AdminModule,
    WebhooksModule,
    MlModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Register resilience middleware first for timeout protection
    consumer.apply(ResilienceMiddleware).forRoutes('*');
    // Then apply metrics middleware
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
