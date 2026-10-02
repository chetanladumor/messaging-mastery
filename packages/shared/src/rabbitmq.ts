import amqp from 'amqplib';
import { config } from './config.js';

export class RabbitMQClient {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;

  constructor(url?: string) {
    this.url = url || config.rabbitmq.url;
  }

  async connect(): Promise<void> {
    if (!this.connection) {
      this.connection = await amqp.connect(this.url);
    }
    if (!this.channel) {
      this.channel = await this.connection.createChannel();
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  async assertExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'fanout' | 'headers' = 'direct',
    options?: amqp.Options.AssertExchange
  ): Promise<amqp.Replies.AssertExchange> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized. Call connect() first.');
    }
    return this.channel.assertExchange(exchange, type, options);
  }

  async assertQueue(
    queue: string,
    options?: amqp.Options.AssertQueue
  ): Promise<amqp.Replies.AssertQueue> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized. Call connect() first.');
    }
    return this.channel.assertQueue(queue, options);
  }

  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    args?: any
  ): Promise<amqp.Replies.Empty> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized. Call connect() first.');
    }
    return this.channel.bindQueue(queue, exchange, routingKey, args);
  }

  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options?: amqp.Options.Publish
  ): boolean {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized. Call connect() first.');
    }
    return this.channel.publish(exchange, routingKey, content, options);
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
