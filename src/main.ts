import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  VERSION_NEUTRAL,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS default logger during bootstrap — Winston takes over immediately after
    bufferLogs: true,
  });

  app.use(helmet());

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // GlobalExceptionFilter now receives Winston via DI — register via app.get
  // so the injected logger is resolved from the NestJS container
  const { GlobalExceptionFilter } =
    await import('./common/filters/global-exception.filter.js');
  app.useGlobalFilters(app.get(GlobalExceptionFilter));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: '*' });

  // ── Swagger ──────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Library Management API')
    .setDescription(
      'RESTful API for managing books, users, and the borrowing process.',
    )
    .setVersion('1.0')
    .addTag('Books', 'Book inventory management')
    .addTag('Users', 'User registration and management')
    .addTag('Borrowing', 'Checkout, return, and overdue tracking')
    .addTag('Reports', 'Analytics and CSV exports')
    .addBasicAuth({ type: 'http', scheme: 'basic' }, 'basic-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(
    process.env.SERVER_PORT ?? 3000,
    process.env.SERVER_HOST ?? '0.0.0.0',
  );

  const url = await app.getUrl();
  app
    .get(WINSTON_MODULE_NEST_PROVIDER)
    .log(`Application running on ${url}`, 'Bootstrap');
  app
    .get(WINSTON_MODULE_NEST_PROVIDER)
    .log(`Swagger docs: ${url}/api/docs`, 'Bootstrap');
}
bootstrap();
