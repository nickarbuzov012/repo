import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  OUTBOX_PUBLISH_INTERVAL_MS,
  OUTBOX_PUBLISH_JOB,
  OUTBOX_QUEUE,
  OUTBOX_REPEATABLE_JOB_ID,
} from './outbox.constants';

@Injectable()
export class OutboxScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(OutboxScheduler.name);

  constructor(
    @InjectQueue(OUTBOX_QUEUE)
    private readonly outboxQueue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('Outbox scheduler skipped in test environment');
      return;
    }

    const job = await this.outboxQueue.add(
      OUTBOX_PUBLISH_JOB,
      { source: 'scheduler' },
      {
        jobId: OUTBOX_REPEATABLE_JOB_ID,
        repeat: {
          every: OUTBOX_PUBLISH_INTERVAL_MS,
        },
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    );

    this.logger.log(
      `Scheduled outbox publisher: jobId=${job.id} everyMs=${OUTBOX_PUBLISH_INTERVAL_MS}`,
    );
  }
}
