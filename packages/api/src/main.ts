import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { Express, Request, Response } from 'express';

const server = express();

async function bootstrap(): Promise<Express> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    },
    validateCustomDecorators: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));
  
  app.setGlobalPrefix('api');
  
  await app.init();
  
  return server;
}

let cachedServer: any;

export default async function handler(req: Request, res: Response) {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(req, res);
}

// For local development
if (process.env.NODE_ENV !== 'production') {
  bootstrap().then((expressApp) => {
    const port = process.env.PORT || 4000;
    expressApp.listen(port, () => {
      console.log(`🚀 Application is running on: http://localhost:${port}`);
    });
  });
}