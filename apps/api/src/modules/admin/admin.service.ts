import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '@aus-prop/db';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('crawl') private crawlQueue: Queue,
    @InjectQueue('normalize') private normalizeQueue: Queue,
    @InjectQueue('dedupe') private dedupeQueue: Queue,
    @InjectQueue('geo') private geoQueue: Queue,
    @InjectQueue('alerts') private alertsQueue: Queue,
    @InjectQueue('index') private indexQueue: Queue,
    @InjectQueue('reports') private reportsQueue: Queue,
    @InjectQueue('cleanup') private cleanupQueue: Queue,
    @InjectQueue('webhooks') private webhooksQueue: Queue,
    @InjectQueue('ml-predict') private mlPredictQueue: Queue
  ) {}

  async getMetrics() {
    const totalProperties = await this.prisma.property.count();
    const totalListings = await this.prisma.listing.count();
    const totalUsers = await this.prisma.user.count();
    const activeAlerts = await this.prisma.alert.count({ where: { isActive: true } });

    const recentListings = await this.prisma.listing.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      overview: {
        totalProperties,
        totalListings,
        totalUsers,
        activeAlerts,
        recentListings,
      },
      timestamp: new Date(),
    };
  }

  async listWebhookDeliveries(limit = 50, offset = 0) {
    const data = await this.prisma.webhookDelivery.findMany({
      skip: offset,
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    const total = await this.prisma.webhookDelivery.count();

    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async retryWebhookDelivery(id: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({ where: { id } });
    if (!delivery) throw new Error('Webhook delivery not found');

    // Requeue delivery job with a reference to delivery id
    const job = await this.webhooksQueue.add(
      'deliver',
      {
        event: delivery.event,
        payload: delivery.payload,
        targetUrl: (delivery as any).targetUrl || (delivery as any).target_url,
        deliveryId: delivery.id,
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 1000 } }
    );

    // Mark as pending and reset attempts
    await this.prisma.webhookDelivery.update({
      where: { id },
      data: { status: 'pending', attempts: 0, last_attempt_at: null },
    });

    return { jobId: job.id, status: 'requeued' };
  }

  async getQueueStatus() {
    const queues = {
      crawl: await this.getQueueInfo(this.crawlQueue),
      normalize: await this.getQueueInfo(this.normalizeQueue),
      dedupe: await this.getQueueInfo(this.dedupeQueue),
      geo: await this.getQueueInfo(this.geoQueue),
      alerts: await this.getQueueInfo(this.alertsQueue),
      index: await this.getQueueInfo(this.indexQueue),
      reports: await this.getQueueInfo(this.reportsQueue),
      cleanup: await this.getQueueInfo(this.cleanupQueue),
      webhooks: await this.getQueueInfo(this.webhooksQueue),
      'ml-predict': await this.getQueueInfo(this.mlPredictQueue),
    };

    return queues;
  }

  async triggerMlPredict(propertyIds?: string[]) {
    const job = await this.mlPredictQueue.add('batch', { propertyIds }, { attempts: 1 });

    return { jobId: job.id, status: 'queued' };
  }

  async testConnector(connectorName: string) {
    // Add test job to crawl queue
    const job = await this.crawlQueue.add(
      'test',
      { connectorName },
      { attempts: 1, timeout: 30000 }
    );

    return {
      jobId: job.id,
      status: 'queued',
      message: `Testing connector: ${connectorName}`,
    };
  }

  async getAuditLog(limit = 50, offset = 0) {
    const logs = await this.prisma.auditLog.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.auditLog.count();

    return {
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getMergeReviews(limit = 50, offset = 0) {
    const reviews = await this.prisma.mergeReview.findMany({
      include: {
        sourceProperty: true,
        targetProperty: true,
      },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.mergeReview.count();

    return {
      data: reviews,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async approveMerge(mergeId: string) {
    const merge = await this.prisma.mergeReview.findUnique({
      where: { id: mergeId },
    });

    if (!merge) {
      throw new Error('Merge not found');
    }

    // Update merge status
    await this.prisma.mergeReview.update({
      where: { id: mergeId },
      data: { status: 'approved' },
    });

    // Merge listings from source to target
    await this.prisma.listing.updateMany({
      where: { propertyId: merge.sourcePropertyId },
      data: { propertyId: merge.targetPropertyId },
    });

    // Delete source property
    await this.prisma.property.delete({
      where: { id: merge.sourcePropertyId },
    });

    this.logger.log(`Merge approved: ${mergeId}`);
    return { message: 'Merge approved' };
  }

  async rejectMerge(mergeId: string) {
    await this.prisma.mergeReview.update({
      where: { id: mergeId },
      data: { status: 'rejected' },
    });

    this.logger.log(`Merge rejected: ${mergeId}`);
    return { message: 'Merge rejected' };
  }

  private async getQueueInfo(queue: Queue) {
    const counts = await queue.getJobCounts();
    const failed = await queue.getFailed(0, 10);
    const completed = await queue.getCompleted(0, 10);

    return {
      counts,
      recentFailed: failed.length,
      recentCompleted: completed.length,
    };
  }
}
