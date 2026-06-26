import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationServiceModule } from './notification-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(NotificationServiceModule);

  app.setGlobalPrefix('api');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_NOTIFICATION_CLIENT_ID ?? 'notification',
        brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
      },
      consumer: {
        groupId:
          process.env.KAFKA_NOTIFICATION_GROUP_ID ?? 'notification-service',
      },
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.NOTIFICATION_SERVICE_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
