export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  amount: number;
  timestamp: string;
}

export const EXCHANGES = {
  ORDERS: 'orders.exchange',
  ORDERS_DLX: 'orders.dlx',
  ORDERS_BROADCAST: 'orders.broadcast.exchange',
  ORDERS_RETRY: 'orders.retry.exchange'
} as const;  // read only , can not re asign new value

export const QUEUES = {
  PAYMENT_ORDERS: 'orders.payment.queue',
  PAYMENT_ORDERS_DLQ: 'orders.payment.dlq',
  INVENTORY_ORDERS: 'orders.inventory.queue',
  NOTIFICATION_ORDERS: 'orders.notification.queue',
  ORDERS_RETRY: 'orders.retry.queue'
} as const;

export const ROUTING_KEYS = {
  ORDER_CREATED: 'order.created',
  ORDER_DLQ: 'order.dlq',
  ORDER_RETRY: 'order.retry'
} as const;
