import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
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
  NotificationDeliveryStatus,
  NotificationDocument,
  NotificationEntity,
} from './schemas/notification.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(forwardRef(() => NotificationGateway))
    private readonly gateway: NotificationGateway,
    @InjectModel(NotificationEntity.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async handleBalanceTransferred(
    event: BalanceTransferredEvent,
  ): Promise<void> {
    const payload = this.toPayload(event);

    await this.persistNotification(event, [event.senderId, event.recipientId]);
    await this.emitToUsers([event.senderId, event.recipientId], payload);

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

    await this.persistNotification(event, [body.userId]);
    await this.emitToUsers([body.userId], payload);

    this.logger.log(
      `Manual notification persisted and emitted: userId=${body.userId} transferId=${event.transferId}`,
    );
  }

  async redeliverPendingNotifications(userId: string): Promise<void> {
    const notifications = await this.notificationModel
      .find({
        deliveries: {
          $elemMatch: {
            userId,
            status: { $ne: NotificationDeliveryStatus.Acked },
          },
        },
      })
      .sort({ occurredAt: 1 })
      .limit(50)
      .exec();

    for (const notification of notifications) {
      await this.emitToUsers([userId], this.toPayload(notification));
    }
  }

  async markNotificationAcked(
    userId: string,
    notificationId: string,
    socketId?: string,
  ): Promise<boolean> {
    const result = await this.notificationModel.updateOne(
      {
        transferId: notificationId,
        'deliveries.userId': userId,
      },
      {
        $set: {
          'deliveries.$.status': NotificationDeliveryStatus.Acked,
          'deliveries.$.ackedAt': new Date(),
          'deliveries.$.lastSocketId': socketId ?? null,
        },
      },
    );
    const acknowledged = result.modifiedCount > 0 || result.matchedCount > 0;

    if (acknowledged) {
      this.logger.log(
        `Notification acknowledged: userId=${userId} notificationId=${notificationId}`,
      );
    }

    return acknowledged;
  }

  private async persistNotification(
    event: BalanceTransferredEvent,
    userIds: string[],
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
          deliveries: [...new Set(userIds)].map((userId) => ({
            userId,
            status: NotificationDeliveryStatus.Pending,
            attempts: 0,
            sentAt: null,
            ackedAt: null,
            lastSocketId: null,
          })),
        },
      },
      { upsert: true },
    );
  }

  private async emitToUsers(
    userIds: string[],
    payload: UserNotificationPayload,
  ): Promise<void> {
    for (const userId of new Set(userIds)) {
      const acknowledged = await this.gateway.sendNotification(userId, payload);

      if (!acknowledged) {
        await this.markNotificationSent(userId, payload.notificationId);
      }
    }
  }

  private async markNotificationSent(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    await this.notificationModel.updateOne(
      {
        transferId: notificationId,
        'deliveries.userId': userId,
        'deliveries.status': { $ne: NotificationDeliveryStatus.Acked },
      },
      {
        $set: {
          'deliveries.$.status': NotificationDeliveryStatus.Sent,
          'deliveries.$.sentAt': new Date(),
        },
        $inc: {
          'deliveries.$.attempts': 1,
        },
      },
    );
  }

  private toPayload(
    event: BalanceTransferredEvent | NotificationEntity,
  ): UserNotificationPayload {
    return {
      notificationId: event.transferId,
      type: 'balance_transfer',
      transferId: event.transferId,
      senderId: event.senderId,
      recipientId: event.recipientId,
      amountCents: event.amountCents,
      occurredAt:
        event.occurredAt instanceof Date
          ? event.occurredAt.toISOString()
          : event.occurredAt,
      message: 'Balance transfer completed',
    };
  }
}
