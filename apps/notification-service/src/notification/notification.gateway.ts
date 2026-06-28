import { Inject, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  extractBearerToken,
  NOTIFICATION_SOCKET_EVENTS,
  verifyAccessToken,
  type UserNotificationPayload,
} from '@app/common';
import { NotificationService } from './notification.service';

type SocketAuth = {
  token?: string;
};

interface NotificationAckRequest {
  notificationId?: string;
  transferId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly io: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    this.logger.log(`Client connected: socketId=${client.id}`);

    try {
      const token = this.getHandshakeToken(client);
      const payload = verifyAccessToken(
        token,
        this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      );

      client.data.userId = payload.sub;
      await client.join(payload.sub);
      await this.notificationService.redeliverPendingNotifications(payload.sub);

      this.logger.log(
        `Client joined notification room: socketId=${client.id} userId=${payload.sub}`,
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Client disconnected during auth: socketId=${client.id} reason=${reason}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.logger.log(`Client disconnected: socketId=${client.id}`);
  }

  @SubscribeMessage(NOTIFICATION_SOCKET_EVENTS.notificationAck)
  async acknowledgeNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: NotificationAckRequest,
  ): Promise<{ acknowledged: boolean }> {
    const userId = this.getAuthenticatedUserId(client);
    const notificationId = body.notificationId ?? body.transferId;

    if (!notificationId) {
      return { acknowledged: false };
    }

    const acknowledged = await this.notificationService.markNotificationAcked(
      userId,
      notificationId,
      client.id,
    );

    return { acknowledged };
  }

  async sendNotification(
    userId: string,
    payload: UserNotificationPayload,
  ): Promise<boolean> {
    const sockets = await this.io.in(userId).fetchSockets();

    if (sockets.length === 0) {
      this.logger.warn(
        `Notification deferred: userId=${userId} notificationId=${payload.notificationId}`,
      );
      return false;
    }

    const results = await Promise.all(
      sockets.map((socket) => this.emitToSocket(userId, socket.id, payload)),
    );
    const acknowledged = results.some((result) => result);

    this.logger.log(
      `Notification emitted: userId=${userId} notificationId=${payload.notificationId} sockets=${sockets.length} acknowledged=${acknowledged}`,
    );

    return acknowledged;
  }

  private async emitToSocket(
    userId: string,
    socketId: string,
    payload: UserNotificationPayload,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.io
        .to(socketId)
        .timeout(5000)
        .emit(
          NOTIFICATION_SOCKET_EVENTS.notification,
          payload,
          async (error: Error | null, responses: unknown[]) => {
            if (error || responses.length === 0) {
              this.logger.warn(
                `Notification ack timeout: userId=${userId} socketId=${socketId} notificationId=${payload.notificationId}`,
              );
              resolve(false);
              return;
            }

            await this.notificationService.markNotificationAcked(
              userId,
              payload.notificationId,
              socketId,
            );
            resolve(true);
          },
        );
    });
  }

  private getAuthenticatedUserId(client: Socket): string {
    const userId = client.data.userId;

    if (typeof userId !== 'string' || userId.length === 0) {
      client.disconnect(true);
      throw new Error('Unauthenticated socket');
    }

    return userId;
  }

  private getHandshakeToken(client: Socket): string {
    const authorization = client.handshake.headers.authorization;

    if (typeof authorization === 'string') {
      return extractBearerToken(authorization);
    }

    const auth = client.handshake.auth as SocketAuth;

    if (auth.token) {
      return auth.token;
    }

    return extractBearerToken(undefined);
  }
}
