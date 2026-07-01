import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import {
  BALANCE_TRANSFERRED_TOPIC,
  type BalanceTransferredEvent,
} from '@app/common';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationKafkaController {
  private readonly logger = new Logger(NotificationKafkaController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(BALANCE_TRANSFERRED_TOPIC)
  async handleBalanceTransferred(
    @Payload() event: unknown,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const message = context.getMessage();

    if (!this.isBalanceTransferredEvent(event)) {
      this.logger.error(
        `Skipped invalid Kafka event: topic=${context.getTopic()} partition=${context.getPartition()} offset=${message.offset}`,
      );
      await this.commitOffset(context);
      return;
    }

    this.logger.log(
      `Kafka event received: topic=${BALANCE_TRANSFERRED_TOPIC} transferId=${event.transferId}`,
    );

    await this.notificationService.handleBalanceTransferred(event);
    await this.commitOffset(context);
  }

  private async commitOffset(context: KafkaContext): Promise<void> {
    const consumer = context.getConsumer();
    const topic = context.getTopic();
    const partition = context.getPartition();
    const message = context.getMessage();
    const nextOffset = (BigInt(message.offset) + 1n).toString();

    await consumer.commitOffsets([
      {
        topic,
        partition,
        offset: nextOffset,
      },
    ]);

    this.logger.log(
      `Kafka offset committed: topic=${topic} partition=${partition} offset=${nextOffset}`,
    );
  }

  private isBalanceTransferredEvent(
    event: unknown,
  ): event is BalanceTransferredEvent {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const candidate = event as Partial<BalanceTransferredEvent>;

    return (
      this.isNonEmptyString(candidate.transferId) &&
      this.isNonEmptyString(candidate.senderId) &&
      this.isNonEmptyString(candidate.recipientId) &&
      Number.isInteger(candidate.amountCents) &&
      Number(candidate.amountCents) > 0 &&
      this.isNonEmptyString(candidate.occurredAt) &&
      !Number.isNaN(Date.parse(candidate.occurredAt))
    );
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
