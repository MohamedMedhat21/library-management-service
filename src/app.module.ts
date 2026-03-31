import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import typeorm from './config/typeorm';
import server from './config/server';
import { RedisModule } from './infrastructure/cache/redis.module';
import { BooksModule } from './core/books/books.module';
import { BorrowingModule } from './core/borrowing/borrowing.module';
import { UsersModule } from './core/users/users.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ReportsController } from './core/reports/reports.controller';
import { ReportsModule } from './core/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeorm, server],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.getOrThrow('typeorm'),
    }),
    RedisModule,
    BooksModule,
    BorrowingModule,
    UsersModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000, // 60 seconds window
          limit: 100, // global default: 100 req / 60s
        },
      ],
    }),
    ReportsModule,
  ],
  controllers: [AppController, ReportsController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
