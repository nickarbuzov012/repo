import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<NotificationEntity>;

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
}

export const NotificationSchema =
  SchemaFactory.createForClass(NotificationEntity);
