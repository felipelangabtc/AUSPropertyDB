import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BigQueryService } from './bigquery.service';
import { EventTrackingService } from './event-tracking.service';
import { LookerService } from './looker.service';
import { ReportGenerationService } from './report-generation.service';
import { AnalyticsController } from './analytics.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [BigQueryService, EventTrackingService, LookerService, ReportGenerationService],
  controllers: [AnalyticsController],
  exports: [BigQueryService, EventTrackingService, LookerService, ReportGenerationService],
})
export class AnalyticsModule {}
