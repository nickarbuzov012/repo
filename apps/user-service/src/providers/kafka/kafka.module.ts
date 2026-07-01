import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ClientsModule,
  Transport,
  type KafkaOptions,
} from '@nestjs/microservices';
import { KAFKA_CLIENT } from '@app/common';
import { NotificationsProducerService } from './notifications-producer.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): KafkaOptions => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>(
                'KAFKA_USER_SERVICE_CLIENT_ID',
                'user-service',
              ),
              brokers: [
                configService.get<string>('KAFKA_BROKER', 'localhost:9092'),
              ],
            },
          },
        }),
      },
    ]),
  ],
  providers: [NotificationsProducerService],
  exports: [NotificationsProducerService],
})
export class KafkaModule {}
