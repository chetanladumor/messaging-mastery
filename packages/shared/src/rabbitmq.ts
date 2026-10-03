import amqp from 'amqplib';
import { config } from './config.js';

export class RabbitMQClient {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;

  private getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized. Call connect() first.');
    }
    return this.channel;
  }

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
    return this.getChannel().assertExchange(exchange, type, options);
  }

  async assertQueue(
    queue: string,
    options?: amqp.Options.AssertQueue
  ): Promise<amqp.Replies.AssertQueue> {
    return this.getChannel().assertQueue(queue, options);
  }

  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    args?: any
  ): Promise<amqp.Replies.Empty> {
    return this.getChannel().bindQueue(queue, exchange, routingKey, args);
  }

  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options?: amqp.Options.Publish
  ): boolean {
    return this.getChannel().publish(exchange, routingKey, content, options);
  }

  async consume(
    queue: string,
    onMessage: (msg: amqp.ConsumeMessage | null) => void,
    options?: amqp.Options.Consume
  ): Promise<amqp.Replies.Consume> {
    return this.getChannel().consume(queue, onMessage, options);
  }

  ack(message: amqp.Message, allUpTo?: boolean): void {
    this.getChannel().ack(message, allUpTo);
  }

  nack(message: amqp.Message, allUpTo?: boolean, requeue?: boolean): void {
    this.getChannel().nack(message, allUpTo, requeue);
  }

  async purgeQueue(queue: string): Promise<amqp.Replies.PurgeQueue> {
    return this.getChannel().purgeQueue(queue);
  }

  async deleteQueue(queue: string, options?: amqp.Options.DeleteQueue): Promise<amqp.Replies.DeleteQueue> {
    return this.getChannel().deleteQueue(queue, options);
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
