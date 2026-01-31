import logger from '@aus-prop/observability';
import { getConnector, getConnectorRegistry } from '@aus-prop/connectors';
import { PrismaClient } from '@aus-prop/db';
import {
  addressNormalize,
  addressFingerprint,
  fuzzyMatch,
  calcConvenience,
  calcDistance,
} from '@aus-prop/geo';
import { nanoid } from 'nanoid';
import * as nodemailer from 'nodemailer';
import {
  crawlQueue,
  normalizeQueue,
  dedupeQueue,
  geoQueue,
  alertQueue,
  indexQueue,
  reportQueue,
  cleanupQueue,
} from './queues';
import { webhookQueue } from './queues';
import axios from 'axios';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'localhost',
  port: parseInt(process.env.EMAIL_PORT || '1025'),
});

/**
 * Bootstrap worker processes and setup job handlers
 */
async function bootstrap() {
  logger.info('🚀 Starting worker processes...');

  // Crawl job: discover and fetch listings from sources
  crawlQueue.process(20, async (job) => {
    logger.info(`[CRAWL] Processing source: ${job.data.sourceName}`);
    const connector = getConnector(job.data.sourceName, job.data.options || {});
    if (!connector) throw new Error(`Connector not found: ${job.data.sourceName}`);

    try {
      const listings = await connector.discoverListings();
      logger.info(`[CRAWL] Discovered ${listings.length} listings`);

      // Save source record if not exists
      let source = await prisma.source.findFirst({
        where: { name: job.data.sourceName },
      });

      if (!source) {
        source = await prisma.source.create({
          data: {
            id: nanoid(),
            name: job.data.sourceName,
            url: connector.getHealthStatus().message,
            lastCrawledAt: new Date(),
            isActive: true,
          },
        });
      } else {
        await prisma.source.update({
          where: { id: source.id },
          data: { lastCrawledAt: new Date() },
        });
      }

      // Queue each listing for normalization
      for (const listing of listings) {
        await normalizeQueue.add(
          {
            listing,
            sourceId: source.id,
            sourceName: job.data.sourceName,
          },
          { attempts: 3 }
        );
      }

      return { discovered: listings.length };
    } catch (error) {
      logger.error(`[CRAWL] Error: ${error.message}`);
      throw error;
    }
  });

  // Normalize job: convert raw data to standard schema
  normalizeQueue.process(20, async (job) => {
    logger.info(`[NORMALIZE] Processing listing from ${job.data.sourceName}`);
    const { listing, sourceId, sourceName } = job.data;

    try {
      const normalized = {
        id: nanoid(),
        sourceId,
        sourceListingId: listing.id,
        price: listing.price,
        beds: listing.bedrooms,
        baths: listing.bathrooms,
        cars: listing.carspaces,
        propertyType: listing.type,
        url: listing.url,
        title: listing.title,
        description: listing.description,
        images: listing.images,
        publishedAt: new Date(listing.publishedAt),
        createdAt: new Date(),
      };

      // Queue for deduplication
      await dedupeQueue.add(
        {
          listing: normalized,
          address: listing.address,
        },
        { attempts: 3 }
      );

      return { normalized: true };
    } catch (error) {
      logger.error(`[NORMALIZE] Error: ${error.message}`);
      throw error;
    }
  });

  // Dedupe job: entity resolution and merging
  dedupeQueue.process(10, async (job) => {
    logger.info(`[DEDUPE] Processing deduplication`);
    const { listing, address } = job.data;

    try {
      // Parse and normalize address
      const parsed = addressNormalize(address);
      const fingerprint = addressFingerprint(parsed);

      // Find potential duplicates
      const existingProperties = await prisma.property.findMany({
        where: {
          addressFingerprint: fingerprint,
        },
      });

      let propertyId: string;

      if (existingProperties.length === 0) {
        // Create new property
        const property = await prisma.property.create({
          data: {
            id: nanoid(),
            canonicalAddress: parsed.address,
            suburb: parsed.suburb,
            state: parsed.state,
            postcode: parsed.postcode,
            latitude: parsed.latitude || -33.8688,
            longitude: parsed.longitude || 151.2093,
            addressFingerprint: fingerprint,
            convenienceScore: 50,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        propertyId = property.id;
        logger.info(`[DEDUPE] Created new property: ${propertyId}`);
      } else {
        // Use existing property (could merge later)
        propertyId = existingProperties[0].id;
        logger.info(`[DEDUPE] Found existing property: ${propertyId}`);
      }

      // Create listing record
      const listingRecord = await prisma.listing.create({
        data: {
          id: listing.id,
          propertyId,
          sourceId: listing.sourceId,
          price: listing.price,
          beds: listing.beds,
          baths: listing.baths,
          cars: listing.cars,
          propertyType: listing.propertyType,
          url: listing.url,
          title: listing.title,
          description: listing.description,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Queue for geo enrichment
      await geoQueue.add({ propertyId }, { attempts: 2 });

      return { merged: false, propertyId };
    } catch (error) {
      logger.error(`[DEDUPE] Error: ${error.message}`);
      throw error;
    }
  });

  // Geo enrichment: calculate POI distances and scores
  geoQueue.process(15, async (job) => {
    logger.info(`[GEO] Processing geo enrichment for ${job.data.propertyId}`);
    const { propertyId } = job.data;

    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) throw new Error('Property not found');

      // Get all POIs
      const pois = await prisma.pOI.findMany();

      // Calculate distances to POIs
      const distances = [];
      for (const poi of pois) {
        const distance = calcDistance(
          property.latitude,
          property.longitude,
          poi.latitude,
          poi.longitude
        );
        distances.push({
          poiId: poi.id,
          distance,
        });
      }

      // Save closest POIs
      for (const { poiId, distance } of distances.slice(0, 10)) {
        await prisma.propertyPOI.upsert({
          where: {
            propertyId_poiId: { propertyId, poiId },
          },
          create: {
            id: nanoid(),
            propertyId,
            poiId,
            distance,
          },
          update: { distance },
        });
      }

      // Calculate convenience score
      const score = calcConvenience(property.latitude, property.longitude, 'family');

      await prisma.property.update({
        where: { id: propertyId },
        data: { convenienceScore: score },
      });

      // Save price history
      const listing = await prisma.listing.findFirst({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
      });

      if (listing?.price) {
        await prisma.priceHistory.create({
          data: {
            id: nanoid(),
            propertyId,
            price: listing.price,
            source: 'listing',
            capturedAt: new Date(),
          },
        });
      }

      logger.info(`[GEO] Enriched property ${propertyId} with score ${score}`);
      return { enriched: true };
    } catch (error) {
      logger.error(`[GEO] Error: ${error.message}`);
      throw error;
    }
  });

  // Alerts: dispatch notifications
  alertQueue.process(5, async (job) => {
    logger.info(`[ALERTS] Dispatching alert: ${job.data.alertId}`);
    const { alertId, userId, propertyId } = job.data;

    try {
      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) throw new Error('Alert not found');

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.email) throw new Error('User not found');

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) throw new Error('Property not found');

      // Send email notification
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@ausproperty.io',
        to: user.email,
        subject: `🔔 Alert: ${alert.name}`,
        html: `
          <h2>${alert.name}</h2>
          <p>Property: ${property.canonicalAddress}</p>
          <p>${alert.description}</p>
          <a href="${process.env.WEB_URL}/property/${propertyId}">View Property</a>
        `,
      });

      // Record notification
      await prisma.notification.create({
        data: {
          id: nanoid(),
          userId,
          alertId,
          message: alert.name,
          type: 'email',
          sentAt: new Date(),
        },
      });

      logger.info(`[ALERTS] Alert dispatched to ${user.email}`);
      return { sent: true };
    } catch (error) {
      logger.error(`[ALERTS] Error: ${error.message}`);
      throw error;
    }
  });

  // Search indexing
  indexQueue.process(10, async (job) => {
    logger.info(`[INDEX] Updating search indexes`);
    const { propertyId } = job.data;

    try {
      // Update full-text search indexes
      // In production, would use Elasticsearch or Typesense
      const properties = await prisma.property.findMany({
        where: { isActive: true },
      });

      logger.info(`[INDEX] Indexed ${properties.length} properties`);
      return { indexed: true };
    } catch (error) {
      logger.error(`[INDEX] Error: ${error.message}`);
      throw error;
    }
  });

  // Reports generation
  reportQueue.process(3, async (job) => {
    logger.info(`[REPORTS] Generating analytics report`);

    try {
      const report = {
        generatedAt: new Date(),
        totalProperties: await prisma.property.count(),
        totalListings: await prisma.listing.count(),
        totalUsers: await prisma.user.count(),
        activeAlerts: await prisma.alert.count({ where: { isActive: true } }),
        recentListings: await prisma.listing.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      };

      logger.info(`[REPORTS] Report generated: ${JSON.stringify(report)}`);
      return { generated: true, report };
    } catch (error) {
      logger.error(`[REPORTS] Error: ${error.message}`);
      throw error;
    }
  });

  // Cleanup old data
  cleanupQueue.process(1, async (job) => {
    logger.info(`[CLEANUP] Running data cleanup`);

    try {
      // Delete listings older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deleted = await prisma.listing.deleteMany({
        where: {
          status: 'delisted',
          updatedAt: { lt: ninetyDaysAgo },
        },
      });

      logger.info(`[CLEANUP] Deleted ${deleted.count} old listings`);

      // Archive old price history (keep last 2 years)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const archivedCount = await prisma.priceHistory.deleteMany({
        where: {
          capturedAt: { lt: twoYearsAgo },
        },
      });

      logger.info(`[CLEANUP] Archived ${archivedCount.count} old price records`);
      return { cleaned: true };
    } catch (error) {
      logger.error(`[CLEANUP] Error: ${error.message}`);
      throw error;
    }
  });

  // Webhook delivery processor
  webhookQueue.process(10, async (job) => {
    logger.info(`[WEBHOOK] Delivering webhook event=${job.data.event} to ${job.data.targetUrl}`);

    const { event, payload, targetUrl } = job.data;

    try {
      // Create delivery record (audit)
      const delivery = await prisma.webhookDelivery.create({
        data: {
          id: nanoid(),
          event,
          payload,
          targetUrl,
          status: 'pending',
        },
      });

      // Compute HMAC signature
      const secret = process.env.WEBHOOK_SECRET || 'dev-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const res = await axios.post(targetUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
        },
        timeout: 10000,
      });

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'delivered', attempts: delivery.attempts + 1, last_attempt_at: new Date() },
      });

      logger.info(`[WEBHOOK] Delivered ${delivery.id} status=${res.status}`);
      return { delivered: true };
    } catch (error) {
      logger.error(`[WEBHOOK] Delivery error: ${error.message}`);
      // Update delivery if exists
      try {
        if (error?.response?.data)
          logger.error(`[WEBHOOK] Remote response: ${JSON.stringify(error.response.data)}`);
      } catch (e) {}

      // If prisma table exists, attempt to increment attempts
      try {
        if (job.data && job.data.deliveryId) {
          await prisma.webhookDelivery.updateMany({
            where: { id: job.data.deliveryId },
            data: { status: 'failed', attempts: { increment: 1 }, last_attempt_at: new Date() },
          });
        }
      } catch (e) {}

      throw error;
    }
  });

  // Setup recurring jobs
  // Crawl every 6 hours
  await crawlQueue.add({ sourceName: 'demo-json' }, { repeat: { cron: '0 */6 * * *' } });

  // Cleanup every midnight
  await cleanupQueue.add({}, { repeat: { cron: '0 0 * * *' } });

  // Generate reports every week on Monday
  await reportQueue.add({}, { repeat: { cron: '0 0 * * 1' } });

  // Update indexes every hour
  await indexQueue.add({}, { repeat: { cron: '0 * * * *' } });

  logger.info('✅ All job processors configured');
  logger.info('Worker processes ready. Listening for jobs...');
}

bootstrap().catch((error) => {
  logger.error('Worker bootstrap failed:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
