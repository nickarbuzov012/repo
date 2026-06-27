import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '../kafka/kafka.module';
import { OutboxEventEntity } from './entities/outbox-event.entity';
import { OUTBOX_QUEUE } from './outbox.constants';
import { OutboxProcessor } from './processors/outbox.processor';
import { OutboxScheduler } from './outbox.scheduler';
import { OutboxService } from './outbox.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEventEntity]),
    BullModule.registerQueue({
      name: OUTBOX_QUEUE,
    }),
    KafkaModule,
  ],
  providers: [OutboxService, OutboxScheduler, OutboxProcessor],
  exports: [OutboxService],
})
export class OutboxModule {}
