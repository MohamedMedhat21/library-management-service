import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

export const isDev = process.env.SERVER_ENV !== 'production';

export const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  nestWinstonModuleUtilities.format.nestLike('LibraryAPI', {
    prettyPrint: true,
    colors: true,
  }),
);

// File format: structured JSON for log aggregation (prod)
export const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);
