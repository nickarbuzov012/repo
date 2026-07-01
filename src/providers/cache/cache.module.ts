import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { CacheService } from './cache.service';
import { UserCacheService } from './user-cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheService, UserCacheService],
  exports: [CacheService, UserCacheService],
})
export class CacheModule {}
