import { describe, it, expect, afterAll } from 'vitest';
import { RabbitMQClient } from '@messaging/shared';

describe('Step 3: RabbitMQ Client & Queue Declaration (RED Test)', () => {
  let client: RabbitMQClient;

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  it('should initialize RabbitMQClient, create channel, exchange, and bind queue', async () => {
    client = new RabbitMQClient();
    await client.connect();

    expect(client.isConnected()).toBe(true);

    const exchange = 'test.orders.exchange';
    const queue = 'test.orders.queue';
    const routingKey = 'order.created';

    // Assert Direct Exchange
    await client.assertExchange(exchange, 'direct');

    // Assert Queue and Bind to Exchange
    const queueInfo = await client.assertQueue(queue, { durable: true });
    expect(queueInfo.queue).toBe(queue);

    await client.bindQueue(queue, exchange, routingKey);

    // Verify channel is active and can publish
    const published = client.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify({ test: 'hello rabbitmq' }))
    );
    expect(published).toBe(true);
  });
});
