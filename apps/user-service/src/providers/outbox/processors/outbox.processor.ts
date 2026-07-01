import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Brackets, DataSource } from 'typeorm';
import { NotificationsProducerService } from '../../kafka/notifications-producer.service';
import {
  OUTBOX_BATCH_SIZE,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_PUBLISH_JOB,
  OUTBOX_QUEUE,
  OUTBOX_STALE_PROCESSING_MS,
} from '../outbox.constants';
import {
  OutboxEventEntity,
  OutboxEventStatus,
} from '../entities/outbox-event.entity';

@Processor(OUTBOX_QUEUE)
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsProducer: NotificationsProducerService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== OUTBOX_PUBLISH_JOB) {
      this.logger.warn(`Skipped unknown outbox job: jobId=${job.id}`);
      return;
    }

    const events = await this.claimEvents();

    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      await this.publishEvent(event);
    }
  }

  private async claimEvents(): Promise<OutboxEventEntity[]> {
    return this.dataSource.transaction(async (manager) => {
      const events = await manager
        .getRepository(OutboxEventEntity)
        .createQueryBuilder('event')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('event.attempts < :maxAttempts', {
          maxAttempts: OUTBOX_MAX_ATTEMPTS,
        })
        .andWhere(
          new Brackets((query) => {
            query
              .where(
                new Brackets((retryable) => {
                  retryable
                    .where('event.status IN (:...retryableStatuses)', {
                      retryableStatuses: [
                        OutboxEventStatus.Pending,
                        OutboxEventStatus.Failed,
                      ],
                    })
                    .andWhere('event.next_attempt_at <= now()');
                }),
              )
              .orWhere(
                new Brackets((stale) => {
                  stale
                    .where('event.status = :processingStatus', {
                      processingStatus: OutboxEventStatus.Processing,
                    })
                    .andWhere('event.updated_at <= :staleProcessingBefore', {
                      staleProcessingBefore: new Date(
                        Date.now() - OUTBOX_STALE_PROCESSING_MS,
                      ),
                    });
                }),
              );
          }),
        )
        .andWhere('event.status <> :publishedStatus', {
          publishedStatus: OutboxEventStatus.Published,
        })
        .orderBy('event.created_at', 'ASC')
        .limit(OUTBOX_BATCH_SIZE)
        .getMany();

      if (events.length === 0) {
        return [];
      }

      await manager
        .getRepository(OutboxEventEntity)
        .createQueryBuilder()
        .update(OutboxEventEntity)
        .set({
          status: OutboxEventStatus.Processing,
          attempts: () => '"attempts" + 1',
          lastError: null,
        })
        .where('id IN (:...ids)', { ids: events.map((event) => event.id) })
        .execute();

      return events;
    });
  }

  private async publishEvent(event: OutboxEventEntity): Promise<void> {
    try {
      const published = await this.notificationsProducer.emitOutboxEvent(
        event.topic,
        event.payload,
      );

      if (!published) {
        await this.markForRetry(event, 'Kafka producer did not publish event');
        return;
      }

      await this.dataSource.getRepository(OutboxEventEntity).update(
        { id: event.id },
        {
          status: OutboxEventStatus.Published,
          publishedAt: new Date(),
          lastError: null,
        },
      );

      this.logger.log(
        `Outbox event published: id=${event.id} topic=${event.topic} key=${event.eventKey}`,
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      await this.markForRetry(event, reason);
    }
  }

  private async markForRetry(
    event: OutboxEventEntity,
    reason: string,
  ): Promise<void> {
    const nextAttempts = event.attempts + 1;
    const retryDelayMs = Math.min(60_000, 1000 * 2 ** event.attempts);
    const exhausted = nextAttempts >= OUTBOX_MAX_ATTEMPTS;

    await this.dataSource.getRepository(OutboxEventEntity).update(
      { id: event.id },
      {
        status: exhausted
          ? OutboxEventStatus.Failed
          : OutboxEventStatus.Pending,
        lastError: reason,
        nextAttemptAt: new Date(Date.now() + retryDelayMs),
      },
    );

    this.logger.warn(
      `Outbox event publish failed: id=${event.id} topic=${event.topic} attempts=${nextAttempts} reason=${reason}`,
    );
  }
}
