import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  RabbitMQClient,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS
} from '@messaging/shared';

describe('Step 7: Dead Letter Queue (DLQ) & Failure Handling (RED Test)', () => {
  let client: RabbitMQClient;

  beforeAll(async () => {
    client = new RabbitMQClient();
    await client.connect();

    // 1. Declare the Dead Letter Exchange (DLX)
    await client.assertExchange(EXCHANGES.ORDERS_DLX, 'direct', { durable: true });

    // 2. Declare the Dead Letter Queue (DLQ)
    await client.assertQueue(QUEUES.PAYMENT_ORDERS_DLQ, { durable: true });
    await client.bindQueue(QUEUES.PAYMENT_ORDERS_DLQ, EXCHANGES.ORDERS_DLX, ROUTING_KEYS.ORDER_DLQ);

    // 3. Declare primary queue with DLX configuration
    await client.assertExchange(EXCHANGES.ORDERS, 'direct', { durable: true });
    await client.assertQueue(QUEUES.PAYMENT_ORDERS, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.ORDERS_DLX,
        'x-dead-letter-routing-key': ROUTING_KEYS.ORDER_DLQ
      }
    });
    await client.bindQueue(QUEUES.PAYMENT_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CREATED);

    // Purge DLQ before test
    await client.purgeQueue(QUEUES.PAYMENT_ORDERS_DLQ);
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  it('should route rejected message (requeue=false) to orders.payment.dlq', async () => {
    const failingPayload = {
      orderId: 'ord_failing_999',
      customerId: 'cust_bad_card',
      amount: -100, // Invalid amount triggers failure
      timestamp: new Date().toISOString()
    };

    // Promise that resolves when message arrives in the Dead Letter Queue
    let dlqReceivedMessage: any = null;
    let resolveDLQ!: () => void;
    const dlqPromise = new Promise<void>((resolve) => {
      resolveDLQ = resolve;
    });

    // 1. Listen on Dead Letter Queue to catch the rejected message
    await client.consume(
      QUEUES.PAYMENT_ORDERS_DLQ,
      (msg) => {
        if (!msg) return;
        dlqReceivedMessage = JSON.parse(msg.content.toString());
        client.ack(msg);
        resolveDLQ();
      },
      { noAck: false }
    );

    // 2. Listen on primary queue and simulate a business failure by calling nack(requeue: false)
    await client.consume(
      QUEUES.PAYMENT_ORDERS,
      (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        if (data.orderId === 'ord_failing_999') {
          // Reject with requeue: false -> RabbitMQ moves it to DLX!
          client.nack(msg, false, false);
        } else {
          client.ack(msg);
        }
      },
      { noAck: false }
    );

    // 3. Publish failing message to primary exchange
    await client.publish(
      EXCHANGES.ORDERS,
      ROUTING_KEYS.ORDER_CREATED,
      Buffer.from(JSON.stringify(failingPayload))
    );

    // 4. Await message delivery into DLQ (timeout 3 seconds)
    await Promise.race([
      dlqPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for message in DLQ')), 3000)
      )
    ]);

    expect(dlqReceivedMessage).not.toBeNull();
    expect(dlqReceivedMessage.orderId).toBe('ord_failing_999');
    expect(dlqReceivedMessage.customerId).toBe('cust_bad_card');
  });
});
