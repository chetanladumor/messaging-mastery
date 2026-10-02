import { describe, it, expect } from 'vitest';
import {
  checkRabbitMQConnection,
  checkRedisConnection,
  checkPostgresConnection,
} from '../packages/shared/src/connectivity.js';

describe('Infrastructure Connectivity Check (TDD)', () => {
  it('should successfully connect to active RabbitMQ container', async () => {
    const isConnected = await checkRabbitMQConnection();
    expect(isConnected).toBe(true);
  });

  it('should successfully connect to active Redis container and ping', async () => {
    const pong = await checkRedisConnection();
    expect(pong).toBe('PONG');
  });

  it('should successfully connect to active PostgreSQL container and query SELECT 1', async () => {
    const result = await checkPostgresConnection();
    expect(result).toBe(1);
  });
});
