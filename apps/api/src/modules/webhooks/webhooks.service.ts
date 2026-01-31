import { Injectable, Logger } from '@nestjs/common';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import * as crypto from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(@InjectQueue('webhooks') private readonly webhookQueue: Queue) {}

  async handleIncoming(dto: CreateWebhookDto, signature?: string) {
    const payload = JSON.stringify(dto);
    const verified = this.verifySignature(payload, signature || '');

    this.logger.log(`Webhook received event=${dto.event} verified=${verified}`);

    // Enqueue delivery job for the webhook
    await this.webhookQueue.add(
      'deliver',
      {
        event: dto.event,
        payload: dto.payload,
        targetUrl: dto.targetUrl,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      }
    );

    // TODO: persist delivery record in DB (Prisma) for auditing
    return { ok: verified };
  }

  verifySignature(payload: string, signature: string) {
    if (!signature) return false;
    const secret = process.env.WEBHOOK_SECRET || 'dev-secret';
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return hmac === signature;
  }
}
