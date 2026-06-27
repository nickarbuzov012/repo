import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  type BalanceTransferredEvent,
  type UserNotificationPayload,
} from '@app/common';
import { NotificationGateway } from './notification.gateway';
import { type SendNotificationRequest } from './notification.types';
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
    const payload = this.toPayload(event);

    await this.persistNotification(event);
    this.emitToUsers([event.senderId, event.recipientId], payload);

    this.logger.log(
      `Notification persisted and emitted: transferId=${event.transferId}`,
    );
  }

  async sendManualNotification(body: SendNotificationRequest): Promise<void> {
    const now = new Date().toISOString();
    const event: BalanceTransferredEvent = {
      transferId: body.transferId ?? randomUUID(),
      senderId: body.senderId ?? body.userId,
      recipientId: body.recipientId ?? body.userId,
      amountCents: body.amountCents ?? 0,
      occurredAt: now,
    };
    const payload: UserNotificationPayload = {
      ...this.toPayload(event),
      message: 'Manual notification',
    };

    await this.persistNotification(event);
    this.emitToUsers([body.userId], payload);

    this.logger.log(
      `Manual notification persisted and emitted: userId=${body.userId} transferId=${event.transferId}`,
    );
  }

  private async persistNotification(
    event: BalanceTransferredEvent,
  ): Promise<void> {
    await this.notificationModel.updateOne(
      { transferId: event.transferId },
      {
        $setOnInsert: {
          transferId: event.transferId,
          senderId: event.senderId,
          recipientId: event.recipientId,
          amountCents: event.amountCents,
          occurredAt: new Date(event.occurredAt),
        },
      },
      { upsert: true },
    );
  }

  private emitToUsers(
    userIds: string[],
    payload: UserNotificationPayload,
  ): void {
    for (const userId of new Set(userIds)) {
      this.gateway.sendNotification(userId, payload);
    }
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
