import { Module } from '@nestjs/common';
import { SocialFeedController } from './social-feed.controller';
import { SocialFeedService } from './social-feed.service';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { NotificationService } from '../../lib/notification.service';

@Module({
  controllers: [SocialFeedController],
  providers: [SocialFeedService, PrismaService, EventBus, NotificationService],
  exports: [SocialFeedService],
})
export class SocialFeedModule {} 