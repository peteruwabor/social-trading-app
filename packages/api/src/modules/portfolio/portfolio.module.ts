import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService, PrismaService],
  exports: [PortfolioService],
})
export class PortfolioModule {} 