import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { PrismaService } from '../../lib/prisma.service';
import { NotificationService } from '../../lib/notification.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [MobileController],
  providers: [PrismaService, NotificationService],
})
export class MobileModule {} 