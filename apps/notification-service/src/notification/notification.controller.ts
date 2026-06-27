import { Body, Controller, HttpCode, Post } from '@nestjs/common';
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
}
