import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { consoleFormat, isDev, jsonFormat } from './utils/constants';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: isDev ? 'debug' : 'info',
      transports: [
        new winston.transports.Console({
          format: isDev ? consoleFormat : jsonFormat,
        }),

        // In production also write to rotating files
        ...(!isDev
          ? [
              new winston.transports.File({
                filename: 'logs/app.log',
                format: jsonFormat,
                maxsize: 10 * 1024 * 1024, // 10 MB
                maxFiles: 7,
              }),
              // Errors only — separate file for quick triage
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: jsonFormat,
                maxsize: 10 * 1024 * 1024,
                maxFiles: 7,
              }),
            ]
          : []),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class SharedModule {}
