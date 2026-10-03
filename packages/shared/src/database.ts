import pg from 'pg';
import { config } from './config.js';

let pool: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.postgres.url,
      max: 10,
      idleTimeoutMillis: 30000
    });
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  const p = getPostgresPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      customer_id VARCHAR(64) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(32) NOT NULL,
      transaction_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface OrderRecord {
  id: string;
  customerId: string;
  amount: number;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  transactionId: string;
  createdAt?: string;
}

export const orderRepository = {
  async create(order: {
    id: string;
    customerId: string;
    amount: number;
    status?: OrderStatus;
  }): Promise<OrderRecord> {
    const p = getPostgresPool();
    const status = order.status || 'PENDING';
    const query = `
      INSERT INTO orders (id, customer_id, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, customer_id as "customerId", amount, status, created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await p.query(query, [order.id, order.customerId, order.amount, status]);
    const row = res.rows[0];
    return {
      ...row,
      amount: parseFloat(row.amount)
    };
  },

  async findById(id: string): Promise<OrderRecord | null> {
    const p = getPostgresPool();
    const query = `
      SELECT id, customer_id as "customerId", amount, status, created_at as "createdAt", updated_at as "updatedAt"
      FROM orders
      WHERE id = $1
    `;
    const res = await p.query(query, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      amount: parseFloat(row.amount)
    };
  },

  async updateStatus(id: string, status: OrderStatus): Promise<OrderRecord | null> {
    const p = getPostgresPool();
    const query = `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, customer_id as "customerId", amount, status, created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await p.query(query, [status, id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      amount: parseFloat(row.amount)
    };
  }
};

export const paymentRepository = {
  async create(payment: {
    id: string;
    orderId: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED';
    transactionId: string;
  }): Promise<PaymentRecord> {
    const p = getPostgresPool();
    const query = `
      INSERT INTO payments (id, order_id, amount, status, transaction_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, order_id as "orderId", amount, status, transaction_id as "transactionId", created_at as "createdAt"
    `;
    const res = await p.query(query, [
      payment.id,
      payment.orderId,
      payment.amount,
      payment.status,
      payment.transactionId
    ]);
    const row = res.rows[0];
    return {
      ...row,
      amount: parseFloat(row.amount)
    };
  },

  async findByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const p = getPostgresPool();
    const query = `
      SELECT id, order_id as "orderId", amount, status, transaction_id as "transactionId", created_at as "createdAt"
      FROM payments
      WHERE order_id = $1
    `;
    const res = await p.query(query, [orderId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      amount: parseFloat(row.amount)
    };
  }
};
