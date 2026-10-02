import { describe, it, expect, afterAll } from 'vitest';
import { OrderCreatedEvent } from '@messaging/shared';
import { publishOrderCreated, closeOrderPublisher } from '../services/order-service/src/publisher.js';
import { startPaymentConsumer, closePaymentConsumer } from '../services/payment-service/src/consumer.js';

describe('Step 4: Asynchronous Order Flow (GREEN Test)', () => {
  afterAll(async () => {
    await closeOrderPublisher();
    await closePaymentConsumer();
  });

  it('should publish order.created from Order Service and consume with manual ACK in Payment Service', async () => {
    const orderPayload = {
      orderId: 'ord_12345',
      customerId: 'cust_abc',
      amount: 2499,
      timestamp: new Date().toISOString()
    };

    // A promise that resolves when payment consumer receives and processes the order
    let receivedOrder: OrderCreatedEvent | null = null;
    let resolvePayment!: () => void;
    const paymentProcessedPromise = new Promise<void>((resolve) => {
      resolvePayment = resolve;
    });

    // 1. Start consumer and wait for queue/exchange assertion & subscription
    await startPaymentConsumer((data: OrderCreatedEvent, ack: () => void) => {
      receivedOrder = data;
      ack(); // Manually acknowledge
      resolvePayment();
    });

    // 2. Order Service publishes event
    await publishOrderCreated(orderPayload);

    // 3. Wait for consumer to process message
    await paymentProcessedPromise;

    expect(receivedOrder).not.toBeNull();
    const order = receivedOrder as unknown as OrderCreatedEvent;
    expect(order.orderId).toBe('ord_12345');
    expect(order.amount).toBe(2499);
  });
});
