import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationKafkaController } from './notification.kafka-controller';
import { NotificationService } from './notification.service';
import {
  NotificationEntity,
  NotificationSchema,
} from './schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationEntity.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationController, NotificationKafkaController],
  providers: [NotificationGateway, NotificationService],
})
export class NotificationModule {}
