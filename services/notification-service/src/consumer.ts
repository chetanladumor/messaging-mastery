import { RabbitMQClient, EXCHANGES, QUEUES, OrderCreatedEvent } from '@messaging/shared';

let client: RabbitMQClient | null = null;

export async function getNotificationConsumerClient(): Promise<RabbitMQClient> {
  if (!client) {
    client = new RabbitMQClient();
    await client.connect();
    await client.assertExchange(EXCHANGES.ORDERS_BROADCAST, 'fanout', { durable: true });
    await client.assertQueue(QUEUES.NOTIFICATION_ORDERS, { durable: true });
    await client.bindQueue(QUEUES.NOTIFICATION_ORDERS, EXCHANGES.ORDERS_BROADCAST, '');
  }
  return client;
}

export type NotificationHandler = (event: OrderCreatedEvent, ack: () => void) => void;

export async function startNotificationConsumer(handler?: NotificationHandler): Promise<void> {
  const rmq = await getNotificationConsumerClient();

  await rmq.consume(
    QUEUES.NOTIFICATION_ORDERS,
    (msg) => {
      if (!msg) return;
      try {
        const orderData: OrderCreatedEvent = JSON.parse(msg.content.toString());
        if (handler) {
          handler(orderData, () => rmq.ack(msg));
        } else {
          // Default logic: Send email/SMS simulation and ack
          console.log(`[Notification Service] Sent order confirmation SMS to customer ${orderData.customerId}`);
          rmq.ack(msg);
        }
      } catch (err) {
        console.error('[Notification Consumer] Error processing notification message', err);
        rmq.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

export async function closeNotificationConsumer(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
