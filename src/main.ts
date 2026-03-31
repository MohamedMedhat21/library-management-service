import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  VERSION_NEUTRAL,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: '*' });

  await app.listen(
    process.env.SERVER_PORT ?? 3000,
    process.env.SERVER_HOST ?? 'localhost',
  );
}
bootstrap();
