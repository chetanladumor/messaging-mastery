import express, { Router } from 'express';
import { orderRepository } from '@messaging/shared';
import { publishOrderCreated } from './publisher.js';

export const ordersRouter = Router();

ordersRouter.post('/', async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    if (!customerId || typeof amount !== 'number') {
      return res.status(400).json({ error: 'customerId and amount are required' });
    }

    const id = `ord_e2e_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const order = await orderRepository.create({
      id,
      customerId,
      amount,
      status: 'PENDING'
    });

    await publishOrderCreated({
      orderId: id,
      customerId,
      amount,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ordersRouter.get('/:id', async (req, res) => {
  try {
    const order = await orderRepository.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'order-service' });
});

app.use('/orders', ordersRouter);
