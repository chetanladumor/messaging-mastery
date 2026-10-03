import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initDatabase,
  getPostgresPool,
  getRedisClient,
  orderRepository,
  idempotencyService
} from '@messaging/shared';
import { processPaymentWithIdempotency } from '../services/payment-service/src/consumer.js';

describe('Step 8: Redis Idempotency & Duplicate Message Guard (RED Test)', () => {
  const pool = getPostgresPool();
  const redis = getRedisClient();

  const testOrderId = 'ord_idem_999';

  beforeAll(async () => {
    await initDatabase();
    // Clean up Redis and Postgres before test
    await redis.del(`idemp:payment:${testOrderId}`);
    await pool.query('DELETE FROM payments WHERE order_id = $1', [testOrderId]);
    await pool.query('DELETE FROM orders WHERE id = $1', [testOrderId]);

    // Create initial order in PENDING state
    await orderRepository.create({
      id: testOrderId,
      customerId: 'cust_idem_101',
      amount: 4500,
      status: 'PENDING'
    });
  });

  afterAll(async () => {
    await redis.del(`idemp:payment:${testOrderId}`);
    await pool.query('DELETE FROM payments WHERE order_id = $1', [testOrderId]);
    await pool.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
    await redis.quit();
    await pool.end();
  });

  it('should process payment on first attempt and record key in Redis', async () => {
    const event = {
      orderId: testOrderId,
      customerId: 'cust_idem_101',
      amount: 4500,
      timestamp: new Date().toISOString()
    };

    const firstResult = await processPaymentWithIdempotency(event);

    expect(firstResult.status).toBe('PROCESSED');
    expect(firstResult.isDuplicate).toBe(false);

    // Verify exactly 1 payment record exists in PostgreSQL
    const res = await pool.query('SELECT * FROM payments WHERE order_id = $1', [testOrderId]);
    expect(res.rows.length).toBe(1);

    // Verify key exists in Redis
    const isLocked = await idempotencyService.isProcessed(`payment:${testOrderId}`);
    expect(isLocked).toBe(true);
  });

  it('should detect duplicate on second attempt, skip payment, and avoid duplicate DB row', async () => {
    const event = {
      orderId: testOrderId,
      customerId: 'cust_idem_101',
      amount: 4500,
      timestamp: new Date().toISOString()
    };

    // Redelivery of the exact same event!
    const secondResult = await processPaymentWithIdempotency(event);

    expect(secondResult.status).toBe('SKIPPED');
    expect(secondResult.isDuplicate).toBe(true);

    // Crucial: PostgreSQL MUST STILL HAVE EXACTLY 1 RECORD, NOT 2!
    const res = await pool.query('SELECT * FROM payments WHERE order_id = $1', [testOrderId]);
    expect(res.rows.length).toBe(1);
  });
});
