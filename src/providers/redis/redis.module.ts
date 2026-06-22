import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_STORE } from '../cache/cache.constants';
import { REDIS_CLIENT } from './redis.constants';
import { RedisCacheAdapter } from './redis-cache.adapter';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis =>
        new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
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
