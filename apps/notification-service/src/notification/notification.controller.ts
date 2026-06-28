import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { NOTIFICATION_SOCKET_EVENTS } from '@app/common';
import { NotificationService } from './notification.service';
import { type SendNotificationRequest } from './notification.types';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @HttpCode(202)
  async sendNotification(
    @Body() body: SendNotificationRequest,
  ): Promise<{ sent: boolean }> {
    await this.notificationService.sendManualNotification(body);

    return { sent: true };
  }

  @Get('websocket-events')
  getWebSocketEvents(): typeof NOTIFICATION_SOCKET_EVENTS {
    return NOTIFICATION_SOCKET_EVENTS;
  }
}
