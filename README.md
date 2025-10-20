# Nano Server 🚀

A lightweight, high-performance Node.js framework for building web applications and APIs with TypeScript support.

## Features

- ⚡ **High Performance** - Built for speed and efficiency
- 🛠 **TypeScript First** - Full TypeScript support out of the box
- 🔌 **Middleware System** - Extensible middleware architecture
- 🛣 **Router** - Flexible routing with path parameters
- 🔐 **JWT Authentication** - Built-in JWT guard middleware
- 📝 **Body Parsing** - JSON body parsing middleware
- 🐇 **Messaging** - RabbitMQ integration for microservices
- 📊 **Logging** - Structured logging with colors
- 🛡 **Error Handling** - Comprehensive error handling middleware

## Installation

```bash
npm install @angrub/nano-server
```

## Quick Start

```typescript
import { NanoHttpServer, Router } from "nano-server";

// Create server with configuration
const app = new NanoHttpServer({
	port: 3000,
	cors: "*", // or specific origins ['http://localhost:3000']
	logs: true, // enable request logging
});

// Create router
const router = new Router();

// Define routes
router.get("/hello", (ctx) => {
	ctx.response.json({ message: "Hello World!" });
});

router.get("/users/:id", (ctx) => {
	const userId = ctx.request.params.id;
	ctx.response.json({ user: { id: userId, name: "John Doe" } });
});

router.post("/users", (ctx) => {
	const userData = ctx.request.body;
	ctx.response.status(201).json({
		message: "User created",
		user: userData,
	});
});

// Add router as middleware
app.add(router);

// Start server
app.listen();
```

## Configuration

```typescript
const app = new NanoHttpServer({
	port: 3000, // Server port (default: 3000)
	cors: "*", // CORS settings (default: '*')
	logs: true, // Enable request logging (default: false)
});
```

## Middlewares

### Built-in Middlewares (Automatically added)

**ExceptionHandler** - Global error handling

**BodyParser** - JSON body parsing

**RequestLogger** - Request logging (if logs: true)

### Adding Custom Middlewares

```typescript
import { INanoMiddleware, NanoCTX, NextFunction } from "nano-server";

class CustomMiddleware implements INanoMiddleware {
	async handle(ctx: NanoCTX, next: NextFunction) {
		// Before request
		console.log("Request started:", ctx.request.method, ctx.request.path);

		await next();

		// After request
		console.log("Request completed:", ctx.response.status);
	}
}

app.add(new CustomMiddleware());
```

## Routing

```typescript
import { Router } from "nano-server";

const router = new Router();

// Basic routes
router.get("/users", (ctx) => {
	ctx.response.json({ users: [] });
});

router.post("/users", (ctx) => {
	const userData = ctx.request.body;
	// Process user creation
	ctx.response.status(201).json({ message: "User created" });
});

router.put("/users/:id", (ctx) => {
	const userId = ctx.request.params.id;
	const userData = ctx.request.body;
	// Update user
	ctx.response.json({ message: "User updated" });
});

router.delete("/users/:id", (ctx) => {
	const userId = ctx.request.params.id;
	// Delete user
	ctx.response.json({ message: "User deleted" });
});

// Path parameters
router.get("/users/:id/posts/:postId", (ctx) => {
	const { id, postId } = ctx.request.params;
	ctx.response.json({ userId: id, postId });
});

// Add router to server
app.add(router);
```

## Context Object (NanoCTX)

```typescript
router.get("/example", (ctx) => {
	// Request information
	console.log(ctx.request.method); // 'GET'
	console.log(ctx.request.path); // '/example'
	console.log(ctx.request.params); // Path parameters
	console.log(ctx.request.body); // Parsed request body
	console.log(ctx.request.getHeader("content-type"));

	// Response methods
	ctx.response.json({ data: "hello" });
	ctx.response.status(201);
	ctx.response.setHeader("X-Custom", "value");

	// Custom payload (for middleware communication)
	ctx.payload.userId = "123";
});
```

## Messaging (RabbitMQ)

```typescript
import { MessagingService } from "nano-server/core/messaging";

const messaging = new MessagingService({
	url: "amqp://localhost:5672",
	queues: [
		{ name: "notifications", durable: true },
		{ name: "events", durable: false },
	],
});

// Start messaging service
await messaging.start();

// Publish messages
await messaging.publish("notifications", {
	type: "user_created",
	data: { userId: 123, email: "user@example.com" },
});

// Subscribe to messages
await messaging.subscribe("events", {
	handle: async (message) => {
		console.log("Received event:", message);
		// Process message
	},
});
```

## Error Handling

```typescript
import {
	NanoHttpServer,
	Router,
	BadRequestError,
	NotFoundError,
	UnauthorizedError,
} from "nano-server";

const app = new NanoHttpServer({ logs: true });
const router = new Router();


router.get("/api/users/:id", (ctx) => {
	const user = getUserById(ctx.request.params.id);

	if (!user) {
		throw new NotFoundError("User not found");
	}

	ctx.response.json({ user });
});

router.post("/api/users", (ctx) => {
	const userData = ctx.request.body;

	if (!userData.email || !userData.name) {
		throw new BadRequestError("Email and name are required");
	}

	const user = createUser(userData);
	ctx.response.status(201).json({ user });
});

app.add(router);
app.listen();
```

## Logging

```typescript
import { Logger } from "nano-server";

const logger = new Logger("App");

logger.info("Application started");
logger.success("Database connected");
logger.warning("Feature is deprecated");
logger.error("Something went wrong", error);

// Contextual logging
const requestLogger = new Logger("HTTP");
requestLogger.info(`Request: ${ctx.request.method} ${ctx.request.path}`);
```

## API Reference

### Core Classes

**NanoServer** - Main server class

**Router** - Router for defining routes

**Request** - HTTP request object

**Response** - HTTP response object

### Middlewares

**BodyParser** - Parse JSON request bodies

**JWTGuard** - JWT authentication middleware

**ExceptionHandler** - Global error handling

**RequestLogger** - Request logging

**MessagingMiddleware** - RabbitMQ integration

### Utilities

**Logger** - Structured logging

**Jwt** - JWT token utilities
