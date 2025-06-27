import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

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
  
  // Return the Express instance
  return server;
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

// For Vercel
export default bootstrap;