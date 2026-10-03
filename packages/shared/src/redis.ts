import { Redis } from 'ioredis';
import { config } from './config.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }
  return redisClient;
}

export const idempotencyService = {
  /**
   * Checks whether a key has already been marked as processed.
   */
  async isProcessed(key: string): Promise<boolean> {
    const redis = getRedisClient();
    const exists = await redis.exists(`idemp:${key}`);
    return exists === 1;
  },

  /**
   * Attempts to acquire an idempotency lock for a key.
   * Uses Redis SETNX (SET if Not eXists) with TTL in seconds.
   * Returns true if lock was acquired (first time), false if already locked/processed.
   */
  async acquireLock(key: string, ttlSeconds: number = 86400): Promise<boolean> {
    const redis = getRedisClient();
    // NX: only set if key does not exist; EX: expire in ttlSeconds
    const result = await redis.set(`idemp:${key}`, 'PROCESSED', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  },

  /**
   * Removes an idempotency key (useful for tests or error compensations).
   */
  async releaseLock(key: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(`idemp:${key}`);
  }
};
