import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService, PrismaService],
  exports: [PortfolioService],
})
export class PortfolioModule {} 