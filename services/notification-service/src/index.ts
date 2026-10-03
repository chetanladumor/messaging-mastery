import { app } from './app.js';
import { config } from '@messaging/shared';
import { startNotificationConsumer } from './consumer.js';

const PORT = config.ports.notificationService;

app.listen(PORT, async () => {
  console.log(`[Notification Service] running on http://localhost:${PORT}`);
  try {
    await startNotificationConsumer();
    console.log('[Notification Service] RabbitMQ consumer listening on orders.notification.queue');
  } catch (err) {
    console.error('[Notification Service] Failed to start RabbitMQ consumer', err);
  }
});
