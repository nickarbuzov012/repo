import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  BALANCE_RESET_INTERVAL_MS,
  BALANCE_RESET_JOB,
  BALANCE_RESET_QUEUE,
  BALANCE_RESET_REPEATABLE_JOB_ID,
} from './balance-reset.constants';

@Injectable()
export class BalanceResetScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(BalanceResetScheduler.name);

  constructor(
    @InjectQueue(BALANCE_RESET_QUEUE)
    private readonly balanceResetQueue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const job = await this.balanceResetQueue.add(
      BALANCE_RESET_JOB,
      { source: 'scheduler' },
      {
        jobId: BALANCE_RESET_REPEATABLE_JOB_ID,
        repeat: {
          every: BALANCE_RESET_INTERVAL_MS,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    );

    this.logger.log(
      `Scheduled balance reset: jobId=${job.id} everyMs=${BALANCE_RESET_INTERVAL_MS}`,
    );
  }
}
