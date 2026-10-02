import amqp from 'amqplib';
import { Redis } from 'ioredis';
import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export async function checkRabbitMQConnection(): Promise<boolean> {
  const connection = await amqp.connect(config.rabbitmq.url);
  await connection.close();
  return true;
}

export async function checkRedisConnection(): Promise<string> {
  const redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't loop on failure
  });
  const pong = await redis.ping();
  redis.disconnect();
  return pong;
}

export async function checkPostgresConnection(): Promise<number> {
  const pool = new Pool({ connectionString: config.postgres.url });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT 1 as result');
    return parseInt(res.rows[0].result, 10);
  } finally {
    client.release();
    await pool.end();
  }
}
