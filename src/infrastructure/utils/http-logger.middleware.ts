import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const startAt = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startAt;
      const level =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      this.logger.log(level, 'HTTP request', {
        context: 'HttpLogger',
        method,
        url: originalUrl,
        status: statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent,
      });
    });

    next();
  }
}
