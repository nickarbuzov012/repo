import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  BALANCE_TRANSFERRED_TOPIC,
  KAFKA_CLIENT,
  type BalanceTransferredEvent,
} from '@app/common';

@Injectable()
export class NotificationsProducerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationsProducerService.name);
  private connected = false;

  constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Kafka producer not connected yet: reason=${reason}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.client.close();
    }
  }

  async emitBalanceTransferred(
    event: BalanceTransferredEvent,
  ): Promise<boolean> {
    return this.emitOutboxEvent(
      BALANCE_TRANSFERRED_TOPIC,
      event as unknown as Record<string, unknown>,
    );
  }

  async emitOutboxEvent(
    topic: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    await this.connect();
    await firstValueFrom(
      this.client.emit<void, Record<string, unknown>>(topic, payload),
    );

    this.logger.log(`Kafka event sent: topic=${topic}`);

    return true;
  }

  private async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.client.connect();
    this.connected = true;
    this.logger.log('Kafka producer connected');
  }
}
