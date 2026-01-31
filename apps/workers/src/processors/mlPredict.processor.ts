import { PrismaClient } from '@aus-prop/db';
import axios from 'axios';
import { nanoid } from 'nanoid';

export async function processMlBatch(prisma: PrismaClient, options: { propertyIds?: string[]; mlServiceUrl?: string } = {}) {
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

      const payload = {
        property: {
          id: property.id,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          property_type: property.property_type,
          land_size_m2: property.land_size_m2,
          building_size_m2: property.building_size_m2,
          suburb: property.suburb,
          postcode: property.postcode,
          lat: property.lat,
          lng: property.lng,
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
          confidence: predicted.confidence ?? null,
          features: predicted.features ?? {},
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
