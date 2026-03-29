import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis/built/Redis';

export const redisProvider = {
  provide: 'REDIS_CLIENT',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new Redis({
      host: config.get<string>('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
    });
  },
};
