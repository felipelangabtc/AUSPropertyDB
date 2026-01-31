import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MlService } from './ml.service';

@ApiTags('ml')
@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Get('predictions/:propertyId')
  @ApiOperation({ summary: 'Get latest price prediction for a property' })
  async getLatest(@Param('propertyId') propertyId: string) {
    return this.mlService.getLatestPredictionForProperty(propertyId);
  }
}
