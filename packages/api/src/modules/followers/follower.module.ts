import { Module } from '@nestjs/common';
import { FollowerService } from './follower.service';
import { FollowerController } from './follower.controller';
import { PrismaModule } from '../../lib/prisma.service';

@Module({
  imports: [PrismaModule],
  providers: [FollowerService],
  controllers: [FollowerController],
  exports: [FollowerService],
})
export class FollowerModule {} 