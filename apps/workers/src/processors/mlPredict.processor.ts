import { PrismaClient } from '@aus-prop/db';
import axios from 'axios';
import { nanoid } from 'nanoid';

export async function processMlBatch(
  prisma: PrismaClient,
  options: { propertyIds?: string[]; mlServiceUrl?: string } = {}
) {
  const { propertyIds, mlServiceUrl } = options;

  let properties = [];
  if (Array.isArray(propertyIds) && propertyIds.length > 0) {
    properties = await prisma.property.findMany({ where: { id: { in: propertyIds } } });
  } else {
    properties = await prisma.property.findMany({ where: { isActive: true }, take: 200 });
  }

  const mlUrlBase = mlServiceUrl || process.env.ML_SERVICE_URL || 'http://ml:8000';

  const results = [];
  for (const property of properties) {
    try {
      const lastPrice = await prisma.priceHistory.findFirst({
        where: { property_id: property.id },
        orderBy: { captured_at: 'desc' },
      });

      // Extract convenience score (placeholder for now)
      const convenienceScore = Math.min(100, (property.listing_views || 0) / 100);

      const payload = {
        property: {
          bedrooms: property.bedrooms || 2,
          bathrooms: property.bathrooms || 1,
          parkingSpaces: property.parking_spaces || 1,
          landSizeM2: property.land_size_m2 || 500,
          buildingSizeM2: property.building_size_m2 || 120,
          lat: property.lat || -33.8688,
          lng: property.lng || 151.2093,
          convenienceScore: convenienceScore,
        },
        last_price: lastPrice?.price || null,
      };

      const res = await axios.post(`${mlUrlBase}/predict`, payload, { timeout: 15000 });
      const predicted = res.data || {};

      await prisma.pricePrediction.create({
        data: {
          id: nanoid(),
          property_id: property.id,
          model_version: predicted.model_version || 'v1',
          predicted_price: predicted.price ? Math.round(predicted.price) : null,
          confidence: predicted.confidence ?? 0.3,
          features: {
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            parking_spaces: property.parking_spaces,
            land_size_m2: property.land_size_m2,
            building_size_m2: property.building_size_m2,
            lat: property.lat,
            lng: property.lng,
          },
          predicted_at: predicted.predicted_at ? new Date(predicted.predicted_at) : new Date(),
        },
      });

      results.push({ propertyId: property.id, ok: true });
    } catch (err) {
      results.push({ propertyId: property.id, ok: false, error: (err as Error).message });
    }
  }

  return { count: properties.length, results };
}
