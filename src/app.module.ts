import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import typeorm from './config/typeorm';
import server from './config/server';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RedisModule } from './infrastructure/cache/redis.module';
import { BooksModule } from './core/books/books.module';
import { BorrowingModule } from './core/borrowing/borrowing.module';
import { UsersModule } from './core/users/users.module';
import { ReportsModule } from './core/reports/reports.module';
import { AuthModule } from './auth/auth.module';
import { BasicAuthGuard } from './auth/guards/basic-auth.guard';
import { HttpLoggerMiddleware } from './infrastructure/utils/http-logger.middleware';
import { SharedModule } from './common/shared.module';

@Module({
  imports: [
    SharedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeorm, server],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('typeorm'),
    }),
    RedisModule,
    BooksModule,
    BorrowingModule,
    UsersModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
    }),
    ReportsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    GlobalExceptionFilter,
    { provide: APP_GUARD, useClass: BasicAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  // Apply HTTP request/response logging to every route
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
