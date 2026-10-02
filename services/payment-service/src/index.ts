import { app } from './app.js';
import { config } from '@messaging/shared';

const PORT = config.ports.paymentService;

app.listen(PORT, () => {
  console.log(`[Payment Service] running on http://localhost:${PORT}`);
});
