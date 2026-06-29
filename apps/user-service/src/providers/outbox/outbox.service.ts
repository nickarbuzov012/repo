import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  BALANCE_TRANSFERRED_TOPIC,
  type BalanceTransferredEvent,
} from '@app/common';
import {
  OutboxEventEntity,
  OutboxEventStatus,
} from './entities/outbox-event.entity';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  async addBalanceTransferred(
    manager: EntityManager,
    event: BalanceTransferredEvent,
  ): Promise<void> {
    const outboxEvent = new OutboxEventEntity();
    outboxEvent.topic = BALANCE_TRANSFERRED_TOPIC;
    outboxEvent.eventKey = event.transferId;
    outboxEvent.payload = event as unknown as Record<string, unknown>;
    outboxEvent.status = OutboxEventStatus.Pending;
    outboxEvent.nextAttemptAt = new Date();

    await manager.save(OutboxEventEntity, outboxEvent);

    this.logger.log(
      `Outbox event created: topic=${BALANCE_TRANSFERRED_TOPIC} transferId=${event.transferId}`,
    );
  }
}
