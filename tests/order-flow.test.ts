import { describe, it, expect, afterAll } from 'vitest';
import { RabbitMQClient } from '@messaging/shared';
import { publishOrderCreated } from '../services/order-service/src/publisher.js';
import { startPaymentConsumer } from '../services/payment-service/src/consumer.js';

describe('Step 4: Asynchronous Order Flow (RED Test)', () => {
  const client = new RabbitMQClient();

  afterAll(async () => {
    await client.close();
  });

  it('should publish order.created from Order Service and consume with manual ACK in Payment Service', async () => {
    await client.connect();

    const orderPayload = {
      orderId: 'ord_12345',
      customerId: 'cust_abc',
      amount: 2499,
      timestamp: new Date().toISOString()
    };

    // A promise that resolves when payment consumer receives and processes the order
    let receivedOrder: typeof orderPayload | null = null;
    const paymentProcessedPromise = new Promise<void>((resolve) => {
      startPaymentConsumer((data, ack) => {
        receivedOrder = data;
        ack(); // Manually acknowledge
        resolve();
      });
    });

    // Order Service publishes event
    await publishOrderCreated(orderPayload);

    // Wait for consumer to process message
    await paymentProcessedPromise;

    expect(receivedOrder).not.toBeNull();
    expect(receivedOrder?.orderId).toBe('ord_12345');
    expect(receivedOrder?.amount).toBe(2499);
  });
});
