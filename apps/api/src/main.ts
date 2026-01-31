import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import logger from '@aus-prop/observability';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet for security
  app.use(helmet());

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('AUS Property Intelligence DB API')
    .setDescription('Complete Australian property database platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('properties', 'Property endpoints')
    .addTag('search', 'Search endpoints')
    .addTag('users', 'User endpoints')
    .addTag('admin', 'Admin endpoints')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  const host = process.env.API_HOST || '0.0.0.0';

  await app.listen(port, host);
  logger.info(`✨ API Server listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start API server', err);
  process.exit(1);
});
