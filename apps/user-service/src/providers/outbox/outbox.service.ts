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
    await manager.insert(OutboxEventEntity, {
      topic: BALANCE_TRANSFERRED_TOPIC,
      eventKey: event.transferId,
      payload: event as unknown as Record<string, unknown>,
      status: OutboxEventStatus.Pending,
      nextAttemptAt: new Date(),
    });

    this.logger.log(
      `Outbox event created: topic=${BALANCE_TRANSFERRED_TOPIC} transferId=${event.transferId}`,
    );
  }
}
