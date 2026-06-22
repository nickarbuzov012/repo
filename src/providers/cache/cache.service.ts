import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CacheStore } from './cache-store';
import { CACHE_STORE, CACHE_TTL_SECONDS } from './cache.constants';

const USERS_LIST_VERSION_KEY = 'users-api:users:list:version';

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

  async usersListKey(
    scope: string,
    parameters: Record<string, number | string | undefined>,
  ): Promise<string> {
    const version = await this.getUsersListVersion();
    const normalizedParameters = Object.entries(parameters)
      .filter(
        (entry): entry is [string, number | string] => entry[1] !== undefined,
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}:${this.normalizeKeyValue(value)}`)
      .join(':');

    return `users-api:users:list:v${version}:${scope}:${normalizedParameters}`;
  }

  userProfileKey(userId: string): string {
    return `users-api:users:profile:${userId}`;
  }

  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.delete(this.userProfileKey(userId)),
      this.incrementUsersListVersion(),
    ]);
  }

  async incrementUsersListVersion(): Promise<void> {
    try {
      await this.store.increment(USERS_LIST_VERSION_KEY);
    } catch (error: unknown) {
      this.logFailure('increment version', USERS_LIST_VERSION_KEY, error);
    }
  }

  private async getUsersListVersion(): Promise<number> {
    try {
      const value = await this.store.get(USERS_LIST_VERSION_KEY);
      return value === null ? 0 : Number(value);
    } catch (error: unknown) {
      this.logFailure('read version', USERS_LIST_VERSION_KEY, error);
      return 0;
    }
  }

  private async delete(key: string): Promise<void> {
    try {
      await this.store.delete(key);
    } catch (error: unknown) {
      this.logFailure('delete', key, error);
    }
  }

  private normalizeKeyValue(value: number | string): string {
    return encodeURIComponent(
      typeof value === 'string' ? value.trim().toLowerCase() : String(value),
    );
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
