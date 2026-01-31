import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(200)
  async receive(@Body() dto: CreateWebhookDto, @Headers('x-signature') signature?: string) {
    await this.webhooksService.handleIncoming(dto, signature);
    return { received: true };
  }
}
