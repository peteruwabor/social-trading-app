import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FollowerService } from './follower.service';
import { FollowerController } from './follower.controller';
import { PrismaModule } from '../../lib/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    PrismaModule,
  ],
  providers: [FollowerService],
  controllers: [FollowerController],
  exports: [FollowerService],
})
export class FollowerModule {} 