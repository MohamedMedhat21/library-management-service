import { registerAs } from '@nestjs/config';

const config = {
  host: process.env.SERVER_HOST || 'localhost',
  port: process.env.SERVER_PORT || 3000,
  env: process.env.SERVER_ENV ?? 'development',
  country: process.env.SERVER_COUNTRY || 'EG',
  timezone: process.env.SERVER_TIMEZONE || 'Africa/Cairo',
};

export default registerAs('server', () => config);
