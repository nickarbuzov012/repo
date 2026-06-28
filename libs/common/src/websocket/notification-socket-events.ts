export const NOTIFICATION_SOCKET_EVENTS = {
  notification: 'notification',
  notificationAck: 'notification:ack',
} as const;

export type NotificationSocketEvent =
  (typeof NOTIFICATION_SOCKET_EVENTS)[keyof typeof NOTIFICATION_SOCKET_EVENTS];
