import { RabbitMQClient, RabbitMQConfig } from "@core";
import { EventEmitter } from "events";

jest.mock("amqplib", () => ({
	connect: jest.fn(),
}));

const mockLoggerMethods = {
	info: jest.fn(),
	error: jest.fn(),
	warning: jest.fn(),
	success: jest.fn(),
};

jest.mock("@util", () => ({
	Logger: jest.fn(() => mockLoggerMethods),
}));

describe("RabbitMQClient", () => {
	let client: RabbitMQClient;
	let mockConnection: any;
	let mockChannel: any;

	const config: RabbitMQConfig = {
		url: "amqp://localhost:5672",
		queues: [
			{ name: "test.queue", durable: true },
			{ name: "another.queue", durable: false },
		],
		reconnectDelay: 1000,
		maxRetries: 3,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock del channel
		mockChannel = {
			assertQueue: jest.fn(),
			prefetch: jest.fn(),
			sendToQueue: jest.fn().mockReturnValue(true),
			consume: jest.fn(),
			ack: jest.fn(),
			nack: jest.fn(),
			close: jest.fn(),
		};

		// Mock de la conexión
		mockConnection = {
			createChannel: jest.fn().mockResolvedValue(mockChannel),
			close: jest.fn(),
			connection: new EventEmitter(),
		};

		require("amqplib").connect.mockResolvedValue(mockConnection);

		client = new RabbitMQClient(config);
	});

	describe("connect", () => {
		test("should connect successfully and setup queues", async () => {
			await client.connect();

			expect(require("amqplib").connect).toHaveBeenCalledWith(config.url);
			expect(mockConnection.createChannel).toHaveBeenCalled();
			expect(mockChannel.prefetch).toHaveBeenCalledWith(1);

			expect(mockChannel.assertQueue).toHaveBeenCalledWith("test.queue", {
				durable: true,
			});
			expect(mockChannel.assertQueue).toHaveBeenCalledWith(
				"another.queue",
				{ durable: false },
			);

			expect(mockLoggerMethods.success).toHaveBeenCalledWith(
				"Successfully connected to RabbitMQ",
			);
		});

		test("should handle connection errors", async () => {
			const connectionError = new Error("Connection failed");
			require("amqplib").connect.mockRejectedValue(connectionError);

			await client.connect();

			expect(mockLoggerMethods.error).toHaveBeenCalledWith(
				"Failed to connect to RabbitMQ: Error: Connection failed",
			);
		});

		test("should setup event listeners on connection", async () => {
			await client.connect();

			mockConnection.connection.emit("close");
			expect(mockLoggerMethods.warning).toHaveBeenCalledWith(
				"RabbitMQ connection closed",
			);

			const error = new Error("Connection error");
			mockConnection.connection.emit("error", error);
			expect(mockLoggerMethods.error).toHaveBeenCalledWith(
				"RabbitMQ connection error: Error: Connection error",
			);
		});
	});

	describe("publishToQueue", () => {
		beforeEach(async () => {
			await client.connect();
		});

		test("should publish message to queue", async () => {
			const testMessage = { id: 1, name: "Test Message" };
			const result = await client.publishToQueue(
				"test.queue",
				testMessage,
			);

			expect(result).toBe(true);
			expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
				"test.queue",
				expect.any(Buffer),
				{
					persistent: true,
					messageId: expect.stringMatching(/^msg_\d+_[a-z0-9]+$/),
				},
			);
		});

		test("should throw error when not connected", async () => {
			(client as any).isConnected = false;

			await expect(
				client.publishToQueue("test.queue", {}),
			).rejects.toThrow("RabbitMQ client is not connected");
		});
	});

	describe("consumeQueue", () => {
		beforeEach(async () => {
			await client.connect();
		});

		test("should consume messages from queue", async () => {
			const messageHandler = jest.fn().mockResolvedValue(undefined);

			await client.consumeQueue("test.queue", messageHandler);

			expect(mockChannel.consume).toHaveBeenCalledWith(
				"test.queue",
				expect.any(Function),
			);
			expect(mockLoggerMethods.info).toHaveBeenCalledWith(
				"Started consuming queue 'test.queue'",
			);
		});

		test("should process messages and ack on success", async () => {
			const messageHandler = jest.fn().mockResolvedValue(undefined);
			await client.consumeQueue("test.queue", messageHandler);

			const consumeCallback = mockChannel.consume.mock.calls[0][1];
			const mockMessage = {
				content: Buffer.from(
					JSON.stringify({
						id: "123",
						type: "Test",
						timestamp: new Date(),
						data: { test: "data" },
					}),
				),
			};

			await consumeCallback(mockMessage);

			expect(messageHandler).toHaveBeenCalledWith({ test: "data" });
			expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
		});

		test("should nack message on handler error", async () => {
			const handlerError = new Error("Handler failed");
			const messageHandler = jest.fn().mockRejectedValue(handlerError);
			await client.consumeQueue("test.queue", messageHandler);

			const consumeCallback = mockChannel.consume.mock.calls[0][1];
			const mockMessage = {
				content: Buffer.from(JSON.stringify({ data: {} })),
			};

			await consumeCallback(mockMessage);

			expect(mockLoggerMethods.error).toHaveBeenCalledWith(
				"Error processing message from queue test.queue: Error: Handler failed",
			);
			expect(mockChannel.nack).toHaveBeenCalledWith(
				mockMessage,
				false,
				false,
			);
		});
	});

	describe("disconnect", () => {
		test("should disconnect successfully", async () => {
			await client.connect();
			await client.disconnect();

			expect(mockChannel.close).toHaveBeenCalled();
			expect(mockConnection.close).toHaveBeenCalled();
			expect(mockLoggerMethods.info).toHaveBeenCalledWith(
				"Disconnected from RabbitMQ",
			);
		});
	});

	describe("status", () => {
		test("should return correct status when connected", async () => {
			await client.connect();
			expect(client.status).toBe("connected");
		});

		test("should return disconnected when not connected", () => {
			expect(client.status).toBe("disconnected");
		});
	});
});
