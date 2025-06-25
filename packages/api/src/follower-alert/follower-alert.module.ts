import { Module } from '@nestjs/common';
import { FollowerAlertService } from './follower-alert.service';
import { EventBus } from '../lib/event-bus';
import { NotificationService } from '../lib/notification.service';
import { PrismaService } from '../lib/prisma.service';

@Module({
  providers: [FollowerAlertService, EventBus, NotificationService, PrismaService],
  exports: [FollowerAlertService],
})
export class FollowerAlertModule {} 