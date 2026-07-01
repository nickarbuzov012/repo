import { Inject, Injectable } from '@nestjs/common';
import type { CacheStore } from './cache-store';
import { CACHE_STORE } from './cache.constants';
import { CacheService } from './cache.service';

const USERS_LIST_VERSION_KEY = 'users-api:users:list:version';

@Injectable()
export class UserCacheService extends CacheService {
  constructor(@Inject(CACHE_STORE) store: CacheStore) {
    super(store);
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
    await this.invalidateUsers([userId]);
  }

  async invalidateUsers(userIds: string[]): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];

    await Promise.all([
      ...uniqueUserIds.map((userId) =>
        this.delete(this.userProfileKey(userId)),
      ),
      this.incrementUsersListVersion(),
    ]);
  }

  async incrementUsersListVersion(): Promise<void> {
    await this.increment(USERS_LIST_VERSION_KEY, 'increment version');
  }

  private async getUsersListVersion(): Promise<number> {
    return (await this.get<number>(USERS_LIST_VERSION_KEY)) ?? 0;
  }

  private normalizeKeyValue(value: number | string): string {
    return encodeURIComponent(
      typeof value === 'string' ? value.trim().toLowerCase() : String(value),
    );
  }
}
