import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Queue } from 'bullmq';
import {
  BALANCE_RESET_JOB,
  BALANCE_RESET_QUEUE,
} from '../balance-reset.constants';
import type { BalanceResetResponse } from '../contracts/balances.contracts';

export class ResetBalancesCommand {}

@CommandHandler(ResetBalancesCommand)
export class ResetBalancesHandler implements ICommandHandler<
  ResetBalancesCommand,
  BalanceResetResponse
> {
  private readonly logger = new Logger(ResetBalancesHandler.name);

  constructor(
    @InjectQueue(BALANCE_RESET_QUEUE)
    private readonly balanceResetQueue: Queue,
  ) {}

  async execute(): Promise<BalanceResetResponse> {
    const job = await this.balanceResetQueue.add(
      BALANCE_RESET_JOB,
      {},
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    );

    this.logger.log(`Enqueued balance reset: jobId=${job.id}`);

    return { jobId: String(job.id) };
  }
}
