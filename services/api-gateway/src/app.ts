import express from 'express';
import { ordersRouter } from '../../order-service/src/app.js';

export const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'api-gateway' });
});

app.use('/api/orders', ordersRouter);
