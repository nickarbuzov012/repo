import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
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
    @Payload() event: BalanceTransferredEvent,
  ): Promise<void> {
    this.logger.log(
      `Kafka event received: topic=${BALANCE_TRANSFERRED_TOPIC} transferId=${event.transferId}`,
    );

    await this.notificationService.handleBalanceTransferred(event);
  }
}
