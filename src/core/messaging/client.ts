import * as amqp from "amqplib";
import { EventEmitter } from "events";

import { Logger } from "@util";
import { Message } from "./";

export interface QueueConfig {
	name: string;
	durable?: boolean;
}

export interface RabbitMQConfig {
	url: string;
	queues?: QueueConfig[];
	reconnectDelay?: number;
	maxRetries?: number;
}

export class RabbitMQClient extends EventEmitter {
    private connection: amqp.ChannelModel | null = null;
    private channel: amqp.Channel | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private logger = new Logger('RabbitMQ');

    constructor(private config: RabbitMQConfig) {
        super();
    }

    public async connect(): Promise<void> {
        try {
            this.logger.info(`Connecting to RabbitMQ at ${this.config.url}`);
            
            // En amqplib 0.10.9, connect() retorna ChannelModel que incluye la conexión
            this.connection = await amqp.connect(this.config.url);
            this.channel = await this.connection.createChannel();
            
            // Configurar calidad de servicio
            await this.channel.prefetch(1);
            await this.setupQueues();
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Los event listeners van en la conexión (que está dentro de ChannelModel)
            this.connection.connection.on('close', () => this.handleConnectionClose());
            this.connection.connection.on('error', (error: Error) => this.handleConnectionError(error));
            
            this.logger.success('Successfully connected to RabbitMQ');
            this.emit('connected');
            
        } catch (error) {
            this.logger.error(`Failed to connect to RabbitMQ: ${error}`);
            await this.handleReconnect();
        }
    }

    private async setupQueues(): Promise<void> {
        if (!this.channel) return;

        for (const queue of this.config.queues || []) {
            await this.channel.assertQueue(queue.name, { 
                durable: queue.durable ?? true
            });
            this.logger.info(`Queue '${queue.name}' declared`);
        }
    }

    public async publishToQueue(queueName: string, message: any): Promise<boolean> {
        if (!this.channel || !this.isConnected) {
            throw new Error('RabbitMQ client is not connected');
        }

        const messageBuffer = this.serializeMessage(message);
        return this.channel.sendToQueue(queueName, messageBuffer, {
            persistent: true,
            messageId: this.generateMessageId()
        });
    }

    public async consumeQueue<T>(
        queueName: string,
        handler: (message: T) => Promise<void>
    ): Promise<void> {
        if (!this.channel || !this.isConnected) {
            throw new Error('RabbitMQ client is not connected');
        }

        await this.channel.consume(queueName, async (msg) => {
            if (!msg) return;

            try {
                const message = this.deserializeMessage<T>(msg.content);
                await handler(message);
                this.channel!.ack(msg);
            } catch (error) {
                this.logger.error(`Error processing message from queue ${queueName}: ${error}`);
                this.channel!.nack(msg, false, false);
            }
        });

        this.logger.info(`Started consuming queue '${queueName}'`);
    }

    private serializeMessage(message: any): Buffer {
        const messageObj: Message = {
            id: this.generateMessageId(),
            type: message.constructor?.name || 'Unknown',
            timestamp: new Date(),
            data: message
        };

        return Buffer.from(JSON.stringify(messageObj));
    }

    private deserializeMessage<T>(buffer: Buffer): T {
        const message: Message = JSON.parse(buffer.toString());
        return message.data as T;
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private handleConnectionClose(): void {
        this.logger.warning('RabbitMQ connection closed');
        this.isConnected = false;
        this.handleReconnect();
    }

    private handleConnectionError(error: Error): void {
        this.logger.error(`RabbitMQ connection error: ${error}`);
        this.isConnected = false;
    }

    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts >= (this.config.maxRetries || 5)) {
            this.logger.error('Max reconnection attempts reached');
            this.emit('connection_failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = (this.config.reconnectDelay || 5000) * this.reconnectAttempts;
        
        this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect().catch(error => {
                this.logger.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error}`);
            });
        }, delay);
    }

    public async disconnect(): Promise<void> {
        this.isConnected = false;
        
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            
            this.logger.info('Disconnected from RabbitMQ');
        } catch (error) {
            this.logger.error(`Error during disconnect: ${error}`);
        }
    }

    public get status(): 'connected' | 'disconnected' | 'reconnecting' {
        if (this.isConnected) return 'connected';
        if (this.reconnectAttempts > 0) return 'reconnecting';
        return 'disconnected';
    }
}