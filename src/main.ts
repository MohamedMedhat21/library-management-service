import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  VERSION_NEUTRAL,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: '*' });

  // ── Swagger ────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Library Management API')
    .setDescription(
      'RESTful API for managing books, users, and the borrowing process.',
    )
    .setVersion('1.0')
    .addTag('Books', 'Book inventory management')
    .addTag('Users', 'user registration and management')
    .addTag('Borrowing', 'Checkout, return, and overdue tracking')
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
    process.env.SERVER_HOST ?? 'localhost',
  );

  console.log(`Swagger docs: ${await app.getUrl()}/api/docs`);
}
bootstrap();
