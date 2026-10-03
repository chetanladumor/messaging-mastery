import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initDatabase,
  getPostgresPool,
  orderRepository,
  paymentRepository
} from '@messaging/shared';

describe('Step 5: PostgreSQL Database Persistence (RED Test)', () => {
  const pool = getPostgresPool();

  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    // Clean up test data and close pool
    await pool.query('DELETE FROM payments WHERE order_id LIKE $1', ['test_ord_%']);
    await pool.query('DELETE FROM orders WHERE id LIKE $1', ['test_ord_%']);
    await pool.end();
  });

  it('should create an order with PENDING status in postgres', async () => {
    const orderId = 'test_ord_001';
    const order = await orderRepository.create({
      id: orderId,
      customerId: 'cust_999',
      amount: 1499.5,
      status: 'PENDING'
    });

    expect(order).toBeDefined();
    expect(order.id).toBe(orderId);
    expect(order.status).toBe('PENDING');

    const fetched = await orderRepository.findById(orderId);
    expect(fetched).not.toBeNull();
    expect(fetched?.amount).toBe(1499.5);
    expect(fetched?.customerId).toBe('cust_999');
  });

  it('should record payment and update order status to PAID', async () => {
    const orderId = 'test_ord_002';
    await orderRepository.create({
      id: orderId,
      customerId: 'cust_888',
      amount: 799,
      status: 'PENDING'
    });

    const payment = await paymentRepository.create({
      id: 'test_pay_001',
      orderId,
      amount: 799,
      status: 'SUCCESS',
      transactionId: 'txn_mock_123'
    });

    expect(payment.id).toBe('test_pay_001');
    expect(payment.status).toBe('SUCCESS');

    // Update order status
    const updated = await orderRepository.updateStatus(orderId, 'PAID');
    expect(updated?.status).toBe('PAID');

    const verified = await orderRepository.findById(orderId);
    expect(verified?.status).toBe('PAID');
  });
});
