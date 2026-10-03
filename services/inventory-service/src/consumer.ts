import { RabbitMQClient, EXCHANGES, QUEUES, OrderCreatedEvent } from '@messaging/shared';

let client: RabbitMQClient | null = null;

export async function getInventoryConsumerClient(): Promise<RabbitMQClient> {
  if (!client) {
    client = new RabbitMQClient();
    await client.connect();
    await client.assertExchange(EXCHANGES.ORDERS_BROADCAST, 'fanout', { durable: true });
    await client.assertQueue(QUEUES.INVENTORY_ORDERS, { durable: true });
    await client.bindQueue(QUEUES.INVENTORY_ORDERS, EXCHANGES.ORDERS_BROADCAST, '');
  }
  return client;
}

export type InventoryHandler = (event: OrderCreatedEvent, ack: () => void) => void;

export async function startInventoryConsumer(handler?: InventoryHandler): Promise<void> {
  const rmq = await getInventoryConsumerClient();

  await rmq.consume(
    QUEUES.INVENTORY_ORDERS,
    (msg) => {
      if (!msg) return;
      try {
        const orderData: OrderCreatedEvent = JSON.parse(msg.content.toString());
        if (handler) {
          handler(orderData, () => rmq.ack(msg));
        } else {
          // Default logic: Reserve stock and ack
          console.log(`[Inventory Service] Reserved warehouse stock for order ${orderData.orderId}`);
          rmq.ack(msg);
        }
      } catch (err) {
        console.error('[Inventory Consumer] Error processing inventory message', err);
        rmq.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

export async function closeInventoryConsumer(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
