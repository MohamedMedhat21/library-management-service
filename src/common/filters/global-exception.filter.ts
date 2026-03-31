import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

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
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolveException(exception);

    const body: ErrorResponse = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'UNKNOWN_ERROR',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} → ${statusCode}: ${JSON.stringify(message)}`,
      );
    }

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // ValidationPipe returns { message: string[] } — surface the array directly
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload
      ) {
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
      return this.resolveQueryFailedError(exception);
    }

    if (exception instanceof Error) {
      this.logger.error('Unhandled exception', exception.stack);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred. Please try again later.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  private resolveQueryFailedError(exception: QueryFailedError): {
    statusCode: number;
    message: string;
  } {
    const code = (exception as QueryFailedError & { code?: string }).code;

    switch (code) {
      // Unique constraint violation (e.g. duplicate ISBN or email)
      case MYSQL_DUPLICATE_ENTRY:
        return {
          statusCode: HttpStatus.CONFLICT,
          message: this.extractDuplicateField(exception.message),
        };

      // Cannot delete parent row — FK constraint (e.g. deleting book with active borrows)
      case MYSQL_FK_CONSTRAINT:
        return {
          statusCode: HttpStatus.CONFLICT,
          message:
            'This record cannot be deleted because it is referenced by other records.',
        };

      // Cannot insert child row — referenced row does not exist
      case MYSQL_NO_REFERENCED:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'A referenced record does not exist.',
        };

      default:
        this.logger.error('Unhandled DB error', exception.stack);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred. Please try again later.',
        };
    }
  }

  private extractDuplicateField(message: string): string {
    const match = message.match(/for key '(.+?)'/);
    if (match) {
      // Take the last segment after the last dot or underscore group
      const keyName = match[1].toLowerCase();
      if (keyName.includes('isbn'))
        return 'A book with this ISBN already exists.';
      if (keyName.includes('email'))
        return 'This email address is already registered.';
    }
    return 'A record with this value already exists.';
  }
}
