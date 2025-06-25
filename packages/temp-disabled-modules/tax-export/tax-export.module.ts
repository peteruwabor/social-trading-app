import { Module } from '@nestjs/common';
import { TaxExportController } from './tax-export.controller';
import { TaxExportService } from './tax-export.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  controllers: [TaxExportController],
  providers: [TaxExportService, PrismaService],
  exports: [TaxExportService],
})
export class TaxExportModule {} 