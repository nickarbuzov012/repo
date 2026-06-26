import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CacheStore } from './cache-store';
import { CACHE_STORE, CACHE_TTL_SECONDS } from './cache.constants';

type CacheValue =
  | null
  | boolean
  | number
  | string
  | CacheValue[]
  | { [key: string]: CacheValue };

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_STORE) private readonly store: CacheStore) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.store.get(key);

      if (value === null) {
        this.logger.debug(`Cache miss: key=${key}`);
        return null;
      }

      this.logger.debug(`Cache hit: key=${key}`);
      return this.deserialize<T>(value);
    } catch (error: unknown) {
      this.logFailure('read', key, error);
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      await this.store.set(
        key,
        JSON.stringify(this.toCacheValue(value)),
        CACHE_TTL_SECONDS,
      );
    } catch (error: unknown) {
      this.logFailure('write', key, error);
    }
  }

  protected async increment(
    key: string,
    operation = 'increment',
  ): Promise<void> {
    try {
      await this.store.increment(key);
    } catch (error: unknown) {
      this.logFailure(operation, key, error);
    }
  }

  protected async delete(key: string): Promise<void> {
    try {
      await this.store.delete(key);
    } catch (error: unknown) {
      this.logFailure('delete', key, error);
    }
  }

  private toCacheValue(value: unknown): CacheValue {
    if (value instanceof Date) {
      return { __date: value.toISOString() };
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toCacheValue(item));
    }

    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.toCacheValue(item),
        ]),
      );
    }

    return value as null | boolean | number | string;
  }

  private deserialize<T>(value: string): T {
    return JSON.parse(value, (_key: string, item: unknown) => {
      if (
        item !== null &&
        typeof item === 'object' &&
        '__date' in item &&
        typeof (item as { __date?: unknown }).__date === 'string'
      ) {
        return new Date((item as { __date: string }).__date);
      }

      return item;
    }) as T;
  }

  private logFailure(operation: string, key: string, error: unknown): void {
    const message =
      error instanceof Error ? error.message : 'Unknown cache store error';
    this.logger.warn(`Cache ${operation} failed: key=${key} error=${message}`);
  }
}
