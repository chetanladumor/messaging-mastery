export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  amount: number;
  timestamp: string;
}

export const EXCHANGES = {
  ORDERS: 'orders.exchange',
  ORDERS_DLX: 'orders.dlx'
} as const;  // read only , can not re asign new value

export const QUEUES = {
  PAYMENT_ORDERS: 'orders.payment.queue',
  PAYMENT_ORDERS_DLQ: 'orders.payment.dlq'
} as const;

export const ROUTING_KEYS = {
  ORDER_CREATED: 'order.created',
  ORDER_DLQ: 'order.dlq'
} as const;
