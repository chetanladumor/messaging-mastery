import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://flipkart:flipkart123@localhost:5672',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  postgres: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/appdb',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  },
  ports: {
    gateway: parseInt(process.env.GATEWAY_PORT || '3000', 10),
    orderService: parseInt(process.env.ORDER_SERVICE_PORT || '3001', 10),
    paymentService: parseInt(process.env.PAYMENT_SERVICE_PORT || '3002', 10),
  },
};
