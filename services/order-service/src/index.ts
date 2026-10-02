import { app } from './app.js';
import { config } from '@messaging/shared';

const PORT = config.ports.orderService;

app.listen(PORT, () => {
  console.log(`[Order Service] running on http://localhost:${PORT}`);
});
