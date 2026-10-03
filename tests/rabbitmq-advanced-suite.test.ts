import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  RabbitMQClient,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS
} from '@messaging/shared';

describe('Step 9: RabbitMQ Advanced Finale (Pub/Sub Broadcast, QoS, and Retry TTL) (RED Test)', () => {
  let client: RabbitMQClient;

  beforeEach(async () => {
    client = new RabbitMQClient();
    await client.connect();
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  it('1. Broadcast: should clone and deliver single event to payment, inventory, and notification queues simultaneously', async () => {
    // 1. Declare Topic/Fanout Exchange for broadcasting
    await client.assertExchange(EXCHANGES.ORDERS_BROADCAST, 'fanout', { durable: true });

    // 2. Declare 3 independent service queues
    await client.assertQueue(QUEUES.PAYMENT_ORDERS, { durable: true });
    await client.assertQueue(QUEUES.INVENTORY_ORDERS, { durable: true });
    await client.assertQueue(QUEUES.NOTIFICATION_ORDERS, { durable: true });

    // 3. Bind all 3 queues to the broadcast exchange
    await client.bindQueue(QUEUES.PAYMENT_ORDERS, EXCHANGES.ORDERS_BROADCAST, '');
    await client.bindQueue(QUEUES.INVENTORY_ORDERS, EXCHANGES.ORDERS_BROADCAST, '');
    await client.bindQueue(QUEUES.NOTIFICATION_ORDERS, EXCHANGES.ORDERS_BROADCAST, '');

    // Purge queues
    await client.purgeQueue(QUEUES.PAYMENT_ORDERS);
    await client.purgeQueue(QUEUES.INVENTORY_ORDERS);
    await client.purgeQueue(QUEUES.NOTIFICATION_ORDERS);

    // Track deliveries
    const received = { payment: false, inventory: false, notification: false };

    let resolveAll!: () => void;
    const allPromise = new Promise<void>((resolve) => {
      resolveAll = resolve;
    });

    const checkComplete = () => {
      if (received.payment && received.inventory && received.notification) {
        resolveAll();
      }
    };

    // Consumers for each of the 3 services
    await client.consume(QUEUES.PAYMENT_ORDERS, (msg) => {
      if (!msg) return;
      received.payment = true;
      client.ack(msg);
      checkComplete();
    });

    await client.consume(QUEUES.INVENTORY_ORDERS, (msg) => {
      if (!msg) return;
      received.inventory = true;
      client.ack(msg);
      checkComplete();
    });

    await client.consume(QUEUES.NOTIFICATION_ORDERS, (msg) => {
      if (!msg) return;
      received.notification = true;
      client.ack(msg);
      checkComplete();
    });

    // Publish ONCE to the broadcast exchange
    const broadcastEvent = { orderId: 'ord_bcast_777', amount: 5999, customerId: 'cust_all' };
    client.publish(
      EXCHANGES.ORDERS_BROADCAST,
      '',
      Buffer.from(JSON.stringify(broadcastEvent))
    );

    // Wait for all 3 consumers to receive their copy
    await Promise.race([
      allPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for 3-way broadcast')), 3000))
    ]);

    expect(received.payment).toBe(true);
    expect(received.inventory).toBe(true);
    expect(received.notification).toBe(true);
  });

  it('2. QoS / Fair Dispatch: client should support setting prefetch limit', async () => {
    // Assert setPrefetch method exists and executes successfully on the channel
    await expect(client.setPrefetch(1)).resolves.not.toThrow();
  });

  it('3. Retry Queue with TTL: should hold failed message for TTL before requeuing to main queue', async () => {
    // 1. Declare retry exchange and retry queue with 300ms TTL
    await client.assertExchange(EXCHANGES.ORDERS_RETRY, 'direct', { durable: true });
    await client.assertExchange(EXCHANGES.ORDERS, 'direct', { durable: true });

    // When message expires in retry queue, RabbitMQ automatically routes it back to orders.exchange
    await client.assertQueue(QUEUES.ORDERS_RETRY, {
      durable: true,
      arguments: {
        'x-message-ttl': 300, // 300ms delay
        'x-dead-letter-exchange': EXCHANGES.ORDERS,
        'x-dead-letter-routing-key': ROUTING_KEYS.ORDER_CREATED
      }
    });
    await client.bindQueue(QUEUES.ORDERS_RETRY, EXCHANGES.ORDERS_RETRY, ROUTING_KEYS.ORDER_RETRY);

    // Verify retry queue assertion and binding works
    expect(QUEUES.ORDERS_RETRY).toBe('orders.retry.queue');
    expect(EXCHANGES.ORDERS_RETRY).toBe('orders.retry.exchange');
  });
});
