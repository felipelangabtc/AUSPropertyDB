import Queue from 'bull';
import logger from '@aus-prop/observability';

// Job queues with Redis backend
export const crawlQueue = new Queue('crawl', process.env.REDIS_URL || 'redis://localhost:6379');
export const normalizeQueue = new Queue(
  'normalize',
  process.env.REDIS_URL || 'redis://localhost:6379'
);
export const dedupeQueue = new Queue('dedupe', process.env.REDIS_URL || 'redis://localhost:6379');
export const geoQueue = new Queue('geo', process.env.REDIS_URL || 'redis://localhost:6379');
export const indexQueue = new Queue('index', process.env.REDIS_URL || 'redis://localhost:6379');
export const alertQueue = new Queue('alerts', process.env.REDIS_URL || 'redis://localhost:6379');
export const reportQueue = new Queue('reports', process.env.REDIS_URL || 'redis://localhost:6379');
export const cleanupQueue = new Queue('cleanup', process.env.REDIS_URL || 'redis://localhost:6379');
export const webhookQueue = new Queue(
  'webhooks',
  process.env.REDIS_URL || 'redis://localhost:6379'
);

// Setup error handlers for all queues
const allQueues = [
  crawlQueue,
  normalizeQueue,
  dedupeQueue,
  geoQueue,
  indexQueue,
  alertQueue,
  webhookQueue,
  reportQueue,
  cleanupQueue,
];

allQueues.forEach((queue) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${queue.name} error:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${queue.name}:${job.id} failed:`, error);
  });

  queue.on('completed', (job) => {
    logger.info(`Job ${queue.name}:${job.id} completed`);
  });
});

export async function closeAllQueues(): Promise<void> {
  await Promise.all(allQueues.map((q) => q.close()));
  logger.info('All queues closed');
}

export async function getQueueStatus() {
  const statuses: Record<string, any> = {};

  for (const queue of allQueues) {
    const counts = await queue.getJobCounts();
    statuses[queue.name] = {
      ...counts,
      isPaused: queue.isPaused(),
    };
  }

  return statuses;
}
