export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  amount: number;
  timestamp: string;
}

export const EXCHANGES = {
  ORDERS: 'orders.exchange'
} as const;  // read only , can not re asign new value

export const QUEUES = {
  PAYMENT_ORDERS: 'orders.payment.queue'
} as const;

export const ROUTING_KEYS = {
  ORDER_CREATED: 'order.created'
} as const;
