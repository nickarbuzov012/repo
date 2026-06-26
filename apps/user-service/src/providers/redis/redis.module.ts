import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_STORE } from '../cache/cache.constants';
import { REDIS_CLIENT } from './redis.constants';
import { RedisCacheAdapter } from './redis-cache.adapter';

const getRedisPort = (configService: ConfigService): number => {
  const port = Number(configService.getOrThrow<string>('REDIS_PORT'));

  if (!Number.isInteger(port)) {
    throw new Error('REDIS_PORT must be an integer');
  }

  return port;
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis =>
        new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: getRedisPort(configService),
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 500,
          retryStrategy: () => null,
        }),
    },
    RedisCacheAdapter,
    {
      provide: CACHE_STORE,
      useExisting: RedisCacheAdapter,
    },
  ],
  exports: [CACHE_STORE],
})
export class RedisModule {}
