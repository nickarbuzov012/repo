import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<NotificationEntity>;

export enum NotificationDeliveryStatus {
  Pending = 'pending',
  Sent = 'sent',
  Acked = 'acked',
}

@Schema({ _id: false })
export class NotificationDelivery {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    required: true,
    enum: NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.Pending,
  })
  status: NotificationDeliveryStatus;

  @Prop({ required: true, default: 0 })
  attempts: number;

  @Prop({ type: Date, nullable: true })
  sentAt: Date | null;

  @Prop({ type: Date, nullable: true })
  ackedAt: Date | null;

  @Prop({ type: String, nullable: true })
  lastSocketId: string | null;
}

const NotificationDeliverySchema =
  SchemaFactory.createForClass(NotificationDelivery);

@Schema({
  collection: 'notifications',
  timestamps: true,
})
export class NotificationEntity {
  @Prop({ required: true, index: true, unique: true })
  transferId: string;

  @Prop({ required: true, index: true })
  senderId: string;

  @Prop({ required: true, index: true })
  recipientId: string;

  @Prop({ required: true, min: 0 })
  amountCents: number;

  @Prop({ required: true })
  occurredAt: Date;

  @Prop({ type: [NotificationDeliverySchema], default: [] })
  deliveries: NotificationDelivery[];
}

export const NotificationSchema =
  SchemaFactory.createForClass(NotificationEntity);
