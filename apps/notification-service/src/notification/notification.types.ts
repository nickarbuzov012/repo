export interface SendNotificationRequest {
  userId: string;
  transferId?: string;
  senderId?: string;
  recipientId?: string;
  amountCents?: number;
}
