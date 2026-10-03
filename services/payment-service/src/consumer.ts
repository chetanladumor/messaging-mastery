import {
  RabbitMQClient,
  OrderCreatedEvent,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
  idempotencyService,
  orderRepository,
  paymentRepository
} from '@messaging/shared';

let client: RabbitMQClient | null = null;

export async function getPaymentConsumerClient(): Promise<RabbitMQClient> {
  if (!client) {
    client = new RabbitMQClient();
    await client.connect();

    // 1. Assert Dead Letter Exchange (DLX) & Dead Letter Queue (DLQ)
    await client.assertExchange(EXCHANGES.ORDERS_DLX, 'direct', { durable: true });
    await client.assertQueue(QUEUES.PAYMENT_ORDERS_DLQ, { durable: true });
    await client.bindQueue(QUEUES.PAYMENT_ORDERS_DLQ, EXCHANGES.ORDERS_DLX, ROUTING_KEYS.ORDER_DLQ);

    // 2. Assert Primary Exchange & Queue with DLX configuration
    await client.assertExchange(EXCHANGES.ORDERS, 'direct', { durable: true });
    await client.assertQueue(QUEUES.PAYMENT_ORDERS, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.ORDERS_DLX,
        'x-dead-letter-routing-key': ROUTING_KEYS.ORDER_DLQ
      }
    });
    await client.bindQueue(QUEUES.PAYMENT_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CREATED);
  }
  return client;
}

export interface ProcessPaymentResult {
  status: 'PROCESSED' | 'SKIPPED';
  isDuplicate: boolean;
  paymentId?: string;
}

export async function processPaymentWithIdempotency(
  event: OrderCreatedEvent
): Promise<ProcessPaymentResult> {
  const lockKey = `payment:${event.orderId}`;
  const acquired = await idempotencyService.acquireLock(lockKey);

  if (!acquired) {
    return {
      status: 'SKIPPED',
      isDuplicate: true
    };
  }

  const paymentId = `pay_${event.orderId}`;
  await paymentRepository.create({
    id: paymentId,
    orderId: event.orderId,
    amount: event.amount,
    status: 'SUCCESS',
    transactionId: `txn_${Date.now()}`
  });

  await orderRepository.updateStatus(event.orderId, 'PAID');

  return {
    status: 'PROCESSED',
    isDuplicate: false,
    paymentId
  };
}

export type PaymentHandler = ( // Function Type or callback signature
  data: OrderCreatedEvent,
  ack: () => void,
  nack: () => void
) => void;

export async function startPaymentConsumer(handler?: PaymentHandler): Promise<void> {
  const rmq = await getPaymentConsumerClient();

  await rmq.consume(
    QUEUES.PAYMENT_ORDERS,
    async (msg) => {
      if (!msg) return;

      try {
        const orderData: OrderCreatedEvent = JSON.parse(msg.content.toString());
        if (handler) {
          handler(
            orderData,
            () => rmq.ack(msg),
            () => rmq.nack(msg, false, true)
          );
        } else {
          await processPaymentWithIdempotency(orderData);
          rmq.ack(msg);
        }
      } catch (err) {
        console.error('[Payment Consumer] Error parsing message, rejecting without requeue', err);
        rmq.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

export async function closePaymentConsumer(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
