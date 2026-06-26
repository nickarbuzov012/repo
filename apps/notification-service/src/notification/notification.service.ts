import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  type BalanceTransferredEvent,
  type UserNotificationPayload,
} from '@app/common';
import { NotificationGateway } from './notification.gateway';
import {
  NotificationDocument,
  NotificationEntity,
} from './schemas/notification.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly gateway: NotificationGateway,
    @InjectModel(NotificationEntity.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async handleBalanceTransferred(
    event: BalanceTransferredEvent,
  ): Promise<void> {
    await this.notificationModel.create({
      transferId: event.transferId,
      senderId: event.senderId,
      recipientId: event.recipientId,
      amountCents: event.amountCents,
      occurredAt: new Date(event.occurredAt),
    });

    const payload = this.toPayload(event);

    this.gateway.sendNotification(event.senderId, payload);
    this.gateway.sendNotification(event.recipientId, payload);

    this.logger.log(
      `Notification persisted and emitted: transferId=${event.transferId}`,
    );
  }

  private toPayload(event: BalanceTransferredEvent): UserNotificationPayload {
    return {
      type: 'balance_transfer',
      transferId: event.transferId,
      senderId: event.senderId,
      recipientId: event.recipientId,
      amountCents: event.amountCents,
      occurredAt: event.occurredAt,
      message: 'Balance transfer completed',
    };
  }
}
