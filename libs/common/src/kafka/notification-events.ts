export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');
export const BALANCE_TRANSFERRED_TOPIC = 'balance.transferred';

export interface BalanceTransferredEvent {
  transferId: string;
  senderId: string;
  recipientId: string;
  amountCents: number;
  occurredAt: string;
}

export interface UserNotificationPayload {
  type: 'balance_transfer';
  transferId: string;
  senderId: string;
  recipientId: string;
  amountCents: number;
  occurredAt: string;
  message: string;
}
