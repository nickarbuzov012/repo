import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

interface SendNotificationRequest {
  userId: string;
  transferId?: string;
  senderId?: string;
  recipientId?: string;
  amountCents?: number;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly gateway: NotificationGateway) {}

  @Post('send')
  @HttpCode(202)
  sendNotification(@Body() body: SendNotificationRequest): { sent: boolean } {
    const now = new Date().toISOString();
    const sent = this.gateway.sendNotification(body.userId, {
      type: 'balance_transfer',
      transferId: body.transferId ?? 'manual',
      senderId: body.senderId ?? body.userId,
      recipientId: body.recipientId ?? body.userId,
      amountCents: body.amountCents ?? 0,
      occurredAt: now,
      message: 'Manual notification',
    });

    return { sent };
  }
}
