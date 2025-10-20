// src/messaging/messaging-service.ts
import { RabbitMQConfig, MessageHandler, RabbitMQClient } from '.';
import { Logger } from '@util';

export class MessagingService {
    private client: RabbitMQClient;
    private logger = new Logger('MessagingService');

    constructor(config: RabbitMQConfig) {
        this.client = new RabbitMQClient(config);
        this.setupEventListeners();
    }

    public async start(): Promise<void> {
        await this.client.connect();
    }

    public async stop(): Promise<void> {
        await this.client.disconnect();
    }

    public async publish<T>(queueName: string, message: T): Promise<void> {
        try {
            const success = await this.client.publishToQueue(queueName, message);
            if (success) {
                this.logger.info(`Message published to queue '${queueName}'`);
            } else {
                throw new Error('Failed to publish message');
            }
        } catch (error) {
            this.logger.error(`Failed to publish to queue '${queueName}': ${error}`);
            throw error;
        }
    }

    public async subscribe<T>(
        queueName: string,
        handler: MessageHandler<T>
    ): Promise<void> {
        await this.client.consumeQueue<T>(queueName, async (message) => {
            this.logger.info(`Received message from queue '${queueName}'`);
            await handler.handle(message);
        });
    }

    private setupEventListeners(): void {
        this.client.on('connected', () => {
            this.logger.success('Messaging service connected');
        });

        this.client.on('connection_failed', () => {
            this.logger.error('Messaging service connection failed');
        });
    }

    public getStatus(): string {
        return this.client.status;
    }
}