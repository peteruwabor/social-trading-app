import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LiveSessionService } from './live-session.service';
import { LiveSessionController } from './live-session.controller';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { NotificationService } from '../../lib/notification.service';

@Module({
  imports: [AuthModule],
  controllers: [LiveSessionController],
  providers: [LiveSessionService, PrismaService, EventBus, NotificationService],
  exports: [LiveSessionService],
})
export class LiveSessionModule {} 