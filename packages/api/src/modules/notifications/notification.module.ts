import { Module } from '@nestjs/common';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationService } from '../../lib/notification.service';
import { FollowerAlertService } from '../../follower-alert/follower-alert.service';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

@Module({
  controllers: [NotificationPreferencesController],
  providers: [
    NotificationService,
    FollowerAlertService,
    PrismaService,
    EventBus,
  ],
  exports: [NotificationService, FollowerAlertService],
})
export class NotificationModule {} 