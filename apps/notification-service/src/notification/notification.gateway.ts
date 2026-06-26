import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  extractBearerToken,
  verifyAccessToken,
  type UserNotificationPayload,
} from '@app/common';

type SocketAuth = {
  token?: string;
};

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

  constructor(private readonly configService: ConfigService) {}

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

  sendNotification(userId: string, payload: UserNotificationPayload): boolean {
    this.io.to(userId).emit('notification', payload);
    this.logger.log(
      `Notification emitted: userId=${userId} transferId=${payload.transferId}`,
    );

    return true;
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
