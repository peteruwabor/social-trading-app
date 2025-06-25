import { Injectable, Module, Global } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { OnModuleDestroy } from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: APP_FILTER,
      useFactory: (httpAdapterHost: HttpAdapterHost) => {
        return new PrismaClientExceptionFilter(httpAdapterHost.httpAdapter);
      },
      inject: [HttpAdapterHost],
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {} 