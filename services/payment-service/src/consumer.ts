import { RabbitMQClient, OrderCreatedEvent, EXCHANGES, QUEUES, ROUTING_KEYS } from '@messaging/shared';

let client: RabbitMQClient | null = null;

export async function getPaymentConsumerClient(): Promise<RabbitMQClient> {
  if (!client) {
    client = new RabbitMQClient();
    await client.connect();
    await client.assertExchange(EXCHANGES.ORDERS, 'direct', { durable: true });
    await client.assertQueue(QUEUES.PAYMENT_ORDERS, { durable: true });
    await client.bindQueue(QUEUES.PAYMENT_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CREATED);
  }
  return client;
}

export type PaymentHandler = ( // Function Type or callback signature
  data: OrderCreatedEvent,
  ack: () => void,
  nack: () => void
) => void;

export async function startPaymentConsumer(handler: PaymentHandler): Promise<void> {
  const rmq = await getPaymentConsumerClient();

  await rmq.consume(
    QUEUES.PAYMENT_ORDERS,
    (msg) => {
      if (!msg) return;

      try {
        const orderData: OrderCreatedEvent = JSON.parse(msg.content.toString());
        handler(
          orderData,
          () => rmq.ack(msg),
          () => rmq.nack(msg, false, true)
        );
      } catch (err) {
        console.error('[Payment Consumer] Error parsing message, rejecting without requeue', err);
        rmq.nack(msg, false, false);
      }
    },
    { noAck: false } // Crucial: manual acknowledgment!
  );
}

export async function closePaymentConsumer(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

