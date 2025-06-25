import { Module } from '@nestjs/common';
import { APIKeyService } from './api-key.service';
import { APIKeyController } from './api-key.controller';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  controllers: [APIKeyController],
  providers: [APIKeyService, PrismaService],
  exports: [APIKeyService],
})
export class APIKeyModule {} 