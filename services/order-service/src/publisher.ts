import { RabbitMQClient, OrderCreatedEvent, EXCHANGES, ROUTING_KEYS } from '@messaging/shared';

let client: RabbitMQClient | null = null;

export async function getOrderPublisherClient(): Promise<RabbitMQClient> {
  if (!client) {
    client = new RabbitMQClient();
    await client.connect();
    await client.assertExchange(EXCHANGES.ORDERS, 'direct', { durable: true });
  }
  return client;
}

export async function publishOrderCreated(order: OrderCreatedEvent): Promise<boolean> {
  const rmq = await getOrderPublisherClient();
  const buffer = Buffer.from(JSON.stringify(order));
  return rmq.publish(EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CREATED, buffer, {
    persistent: true,
    contentType: 'application/json'
  });
}

export async function closeOrderPublisher(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

