export interface MessageHandler<T = any> {
    handle(message: T): Promise<void>;
}

export interface Message {
    id: string;
    type: string;
    timestamp: Date;
    data: any;
}