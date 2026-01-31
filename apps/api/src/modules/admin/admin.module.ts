import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'crawl' },
      { name: 'normalize' },
      { name: 'dedupe' },
      { name: 'geo' },
      { name: 'alerts' },
      { name: 'index' },
      { name: 'reports' },
      { name: 'cleanup' },
      { name: 'webhooks' },
      { name: 'ml-predict' }
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
