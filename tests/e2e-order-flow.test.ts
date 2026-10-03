import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app as gatewayApp } from '../services/api-gateway/src/app.js';
import { initDatabase, getPostgresPool, orderRepository } from '@messaging/shared';
import { closeOrderPublisher } from '../services/order-service/src/publisher.js';
import { startPaymentConsumer, closePaymentConsumer } from '../services/payment-service/src/consumer.js';

describe('Step 6: End-to-End Order Creation Flow (RED Test)', () => {
  const pool = getPostgresPool();

  beforeAll(async () => {
    await initDatabase();

    // Start background payment consumer worker
    await startPaymentConsumer(async (event, ack) => {
      // Simulate payment processing and update DB
      await pool.query(
        'INSERT INTO payments (id, order_id, amount, status, transaction_id) VALUES ($1, $2, $3, $4, $5)',
        [`pay_${event.orderId}`, event.orderId, event.amount, 'SUCCESS', `txn_${Date.now()}`]
      );
      await orderRepository.updateStatus(event.orderId, 'PAID');
      ack();
    });
  });

  afterAll(async () => {
    await closeOrderPublisher();
    await closePaymentConsumer();
    await pool.query('DELETE FROM payments WHERE order_id LIKE $1', ['ord_e2e_%']);
    await pool.query('DELETE FROM orders WHERE id LIKE $1', ['ord_e2e_%']);
    await pool.end();
  });

  it('should accept order via API Gateway, persist as PENDING, and update to PAID via async consumer', async () => {
    // 1. Customer places order via Gateway
    const createRes = await request(gatewayApp)
      .post('/api/orders')
      .send({
        customerId: 'cust_e2e_101',
        amount: 3499.0
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.status).toBe('PENDING');
    expect(createRes.body.amount).toBe(3499.0);

    const orderId = createRes.body.id;

    // 2. Poll / query order until status becomes PAID (max 3 seconds)
    let finalStatus = 'PENDING';
    for (let i = 0; i < 30; i++) {
      const getRes = await request(gatewayApp).get(`/api/orders/${orderId}`);
      if (getRes.status === 200 && getRes.body.status === 'PAID') {
        finalStatus = 'PAID';
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(finalStatus).toBe('PAID');
  });
});
