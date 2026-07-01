import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { CacheStore } from '../cache/cache-store';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisCacheAdapter implements CacheStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  increment(key: string): Promise<number> {
    return this.redis.incr(key);
  }
}
