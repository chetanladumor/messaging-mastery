import { app } from './app.js';
import { config } from '@messaging/shared';
import { startInventoryConsumer } from './consumer.js';

const PORT = config.ports.inventoryService;

app.listen(PORT, async () => {
  console.log(`[Inventory Service] running on http://localhost:${PORT}`);
  try {
    await startInventoryConsumer();
    console.log('[Inventory Service] RabbitMQ consumer listening on orders.inventory.queue');
  } catch (err) {
    console.error('[Inventory Service] Failed to start RabbitMQ consumer', err);
  }
});
