import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform metrics' })
  async getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('queue/status')
  @ApiOperation({ summary: 'Get job queue status' })
  async getQueueStatus() {
    return this.adminService.getQueueStatus();
  }

  @Post('connectors/test')
  @ApiOperation({ summary: 'Test a connector' })
  async testConnector(@Body('connectorName') connectorName: string) {
    return this.adminService.testConnector(connectorName);
  }

  @Post('ml/predict')
  @ApiOperation({ summary: 'Trigger ML batch predictions' })
  async triggerMlPredict(@Body('propertyIds') propertyIds?: string[]) {
    return this.adminService.triggerMlPredict(propertyIds);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Get audit log' })
  async getAuditLog(skip = 0, take = 50) {
    return this.adminService.getAuditLog(take, skip);
  }

  @Get('merge-reviews')
  @ApiOperation({ summary: 'Get pending merge reviews' })
  async getMergeReviews(skip = 0, take = 50) {
    return this.adminService.getMergeReviews(take, skip);
  }

  @Post('merge-reviews/:id/approve')
  @ApiOperation({ summary: 'Approve a merge' })
  async approveMerge(@Param('id') id: string) {
    return this.adminService.approveMerge(id);
  }

  @Post('merge-reviews/:id/reject')
  @ApiOperation({ summary: 'Reject a merge' })
  async rejectMerge(@Param('id') id: string) {
    return this.adminService.rejectMerge(id);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhook deliveries' })
  async listWebhooks(skip = 0, take = 50) {
    return this.adminService.listWebhookDeliveries(take, skip);
  }

  @Post('webhooks/:id/retry')
  @ApiOperation({ summary: 'Retry a webhook delivery' })
  async retryWebhook(@Param('id') id: string) {
    return this.adminService.retryWebhookDelivery(id);
  }
}
