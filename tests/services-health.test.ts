import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app as gatewayApp } from '../services/api-gateway/src/app.js';
import { app as orderApp } from '../services/order-service/src/app.js';
import { app as paymentApp } from '../services/payment-service/src/app.js';

describe('Step 2: Barebone Services Health Check (RED test)', () => {
  it('API Gateway should return 200 and status ok from /health', async () => {
    const res = await request(gatewayApp).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'api-gateway' });
  });

  it('Order Service should return 200 and status ok from /health', async () => {
    const res = await request(orderApp).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'order-service' });
  });

  it('Payment Service should return 200 and status ok from /health', async () => {
    const res = await request(paymentApp).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'payment-service' });
  });
});
