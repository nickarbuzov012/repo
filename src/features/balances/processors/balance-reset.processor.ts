import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { CacheService } from '../../../providers/cache/cache.service';
import { UserEntity } from '../../users/entities/user.entity';
import {
  BALANCE_RESET_JOB,
  BALANCE_RESET_QUEUE,
} from '../balance-reset.constants';

interface BalanceResetCandidate {
  id: string;
}

@Processor(BALANCE_RESET_QUEUE)
export class BalanceResetProcessor extends WorkerHost {
  private readonly logger = new Logger(BalanceResetProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== BALANCE_RESET_JOB) {
      this.logger.warn(`Skipped unknown balance job: jobId=${job.id}`);
      return;
    }

    const resetUserIds = await this.dataSource.transaction(async (manager) => {
      const candidates = await manager
        .getRepository(UserEntity)
        .createQueryBuilder('user')
        .withDeleted()
        .select('user.id', 'id')
        .where('user.balance <> 0')
        .getRawMany<BalanceResetCandidate>();

      if (candidates.length === 0) {
        return [];
      }

      await manager
        .createQueryBuilder()
        .update(UserEntity)
        .set({ balance: 0 })
        .where('balance <> 0')
        .execute();

      return candidates.map((candidate) => candidate.id);
    });

    if (resetUserIds.length > 0) {
      await this.cacheService.invalidateUsers(resetUserIds);
    }

    this.logger.log(
      `Reset user balances: jobId=${job.id} users=${resetUserIds.length}`,
    );
  }
}
