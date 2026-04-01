import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

const MYSQL_DUPLICATE_ENTRY = 'ER_DUP_ENTRY';
const MYSQL_FK_CONSTRAINT = 'ER_ROW_IS_REFERENCED_2';
const MYSQL_NO_REFERENCED = 'ER_NO_REFERENCED_ROW_2';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolve(exception);

    const body: ErrorResponse = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'UNKNOWN_ERROR',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const meta = {
      context: 'ExceptionFilter',
      method: request.method,
      url: request.url,
      status: statusCode,
    };

    if (statusCode >= 500) {
      this.logger.error('Unhandled exception', {
        ...meta,
        stack: exception instanceof Error ? exception.stack : String(exception),
      });
    } else {
      this.logger.warn('Request error', { ...meta, message });
    }

    response.status(statusCode).json(body);
  }

  // ── Resolution logic ─────────────────────────────────────────────────────

  private resolve(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && 'message' in payload) {
        const msg = (payload as Record<string, unknown>).message;
        return {
          statusCode: status,
          message: Array.isArray(msg) ? msg : String(msg),
        };
      }
      return {
        statusCode: status,
        message: typeof payload === 'string' ? payload : exception.message,
      };
    }

    if (exception instanceof EntityNotFoundError) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'The requested resource was not found',
      };
    }

    if (exception instanceof QueryFailedError) {
      return this.resolveQueryError(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  private resolveQueryError(exception: QueryFailedError): {
    statusCode: number;
    message: string;
  } {
    const code = (exception as QueryFailedError & { code?: string }).code;

    switch (code) {
      case MYSQL_DUPLICATE_ENTRY:
        return {
          statusCode: HttpStatus.CONFLICT,
          message: this.extractDuplicateField(exception.message),
        };
      case MYSQL_FK_CONSTRAINT:
        return {
          statusCode: HttpStatus.CONFLICT,
          message:
            'This record cannot be deleted because it is referenced by other records.',
        };
      case MYSQL_NO_REFERENCED:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'A referenced record does not exist.',
        };
      default:
        this.logger.error('Unhandled DB error', {
          context: 'ExceptionFilter',
          code,
          stack: exception.stack,
        });
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred. Please try again later.',
        };
    }
  }

  private extractDuplicateField(message: string): string {
    const match = message.match(/for key '(.+?)'/);
    if (match) {
      const key = match[1].toLowerCase();
      if (key.includes('isbn')) return 'A book with this ISBN already exists.';
      if (key.includes('email'))
        return 'This email address is already registered.';
    }
    return 'A record with this value already exists.';
  }
}
