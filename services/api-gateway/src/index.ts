import { app } from './app.js';
import { config } from '@messaging/shared';

const PORT = config.ports.gateway;

app.listen(PORT, () => {
  console.log(`[API Gateway] running on http://localhost:${PORT}`);
});
