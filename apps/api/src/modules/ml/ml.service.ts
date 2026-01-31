import { Injectable } from '@nestjs/common';
import { PrismaService } from '@aus-prop/db';

@Injectable()
export class MlService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestPredictionForProperty(propertyId: string) {
    return this.prisma.pricePrediction.findFirst({
      where: { property_id: propertyId },
      orderBy: { predicted_at: 'desc' },
    });
  }
}
