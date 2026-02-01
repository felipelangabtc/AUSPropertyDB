import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PropertyValuationService } from './property-valuation.service';
import { MarketPredictionService } from './market-prediction.service';
import { RecommendationEngineService } from './recommendation-engine.service';
import { MLController } from './ml.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PropertyValuationService, MarketPredictionService, RecommendationEngineService],
  controllers: [MLController],
  exports: [PropertyValuationService, MarketPredictionService, RecommendationEngineService],
})
export class MLModule {}
