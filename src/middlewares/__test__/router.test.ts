import { Router } from "@middlewares";
import { HttpMethod, NanoCTX, NotFoundError } from "@core";

const createMockCTX = (method: HttpMethod, path: string): NanoCTX => ({
	request: {
		method,
		path,
		params: {},
		query: {},
		body: {},
		originalPath: path,
	} as any,
	response: {
		setStatus: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		text: jest.fn().mockReturnThis(),
		hasAnswered: jest.fn().mockReturnValue(false),
	} as any,
});

const createNextFunction = () => jest.fn().mockResolvedValue(undefined);

describe("Router", () => {
	let router: Router;

	beforeEach(() => {
		router = new Router();
	});

	describe("Path Normalization", () => {
		test("should normalize paths correctly", () => {
			const testCases = [
				{ input: "", expected: "" },
				{ input: "/", expected: "" },
				{ input: "api", expected: "/api" },
				{ input: "/api", expected: "/api" },
				{ input: "api/", expected: "/api" },
				{ input: "/api/", expected: "/api" },
				{ input: "/api/v1", expected: "/api/v1" },
			];

			testCases.forEach(({ input, expected }) => {
				const result = (router as any).normalizePath(input);
				expect(result).toBe(expected);
			});
		});
	});

	describe("Static Routes", () => {
		test("should register and match GET routes", async () => {
			const handler = jest.fn();
			router.get("/users", handler);

			const ctx = createMockCTX(HttpMethod.GET, "/users");
			const next = createNextFunction();

			await router.handle(ctx, next);

			expect(handler).toHaveBeenCalledWith(ctx);
		});

		test("should return 404 for non-existent routes", async () => {
			const ctx = createMockCTX(HttpMethod.GET, "/non-existent");
			const next = createNextFunction();

			await expect(router.handle(ctx, next)).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe("Dynamic Routes", () => {
		test("should match routes with parameters", async () => {
			const handler = jest.fn();
			router.get("/users/:id", handler);

			const ctx = createMockCTX(HttpMethod.GET, "/users/123");
			const next = createNextFunction();

			await router.handle(ctx, next);

			expect(handler).toHaveBeenCalledWith(ctx);
			expect(ctx.request.params).toEqual({ id: "123" });
		});

		test("should match routes with multiple parameters", async () => {
			const handler = jest.fn();
			router.get("/users/:userId/posts/:postId", handler);

			const ctx = createMockCTX(HttpMethod.GET, "/users/123/posts/456");
			const next = createNextFunction();

			await router.handle(ctx, next);

			expect(handler).toHaveBeenCalledWith(ctx);
			expect(ctx.request.params).toEqual({
				userId: "123",
				postId: "456",
			});
		});
	});

	describe("Router Composition", () => {
		test("should handle nested routers", async () => {
			const mainRouter = new Router();
			const usersRouter = new Router("/users");

			const userHandler = jest.fn();
			usersRouter.get("/:id", userHandler);

			mainRouter.compose(usersRouter);

			const ctx = createMockCTX(HttpMethod.GET, "/users/123");
			const next = createNextFunction();

			await mainRouter.handle(ctx, next);

			expect(userHandler).toHaveBeenCalledWith(ctx);
			expect(ctx.request.params).toEqual({ id: "123" });
		});

		test("should handle deeply nested routers with base paths", async () => {
			const apiRouter = new Router("/api");
			const v1Router = new Router("/v1");
			const usersRouter = new Router("/users");

			const userHandler = jest.fn();
			usersRouter.get("/:id", userHandler);

			v1Router.compose(usersRouter);
			apiRouter.compose(v1Router);

			const ctx = createMockCTX(HttpMethod.GET, "/api/v1/users/123");
			const next = createNextFunction();

			await apiRouter.handle(ctx, next);

			expect(userHandler).toHaveBeenCalledWith(ctx);
			expect(ctx.request.params).toEqual({ id: "123" });
		});

		test("should handle multiple nested routers independently", async () => {
			const mainRouter = new Router();
			const usersRouter = new Router("/users");
			const postsRouter = new Router("/posts");

			const userHandler = jest.fn();
			const postHandler = jest.fn();

			usersRouter.get("/:id", userHandler);
			postsRouter.get("/:id", postHandler);

			mainRouter.compose(usersRouter);
			mainRouter.compose(postsRouter);

			// Test users route
			const userCtx = createMockCTX(HttpMethod.GET, "/users/123");
			await mainRouter.handle(userCtx, createNextFunction());
			expect(userHandler).toHaveBeenCalledWith(userCtx);

			// Test posts route  
			const postCtx = createMockCTX(HttpMethod.GET, "/posts/456");
			await mainRouter.handle(postCtx, createNextFunction());
			expect(postHandler).toHaveBeenCalledWith(postCtx);
		});
	});

	describe("HTTP Methods", () => {
		test("should handle all HTTP methods correctly", async () => {
			const getHandler = jest.fn();
			const postHandler = jest.fn();
			const putHandler = jest.fn();
			const patchHandler = jest.fn();
			const deleteHandler = jest.fn();

			router.get("/resource", getHandler);
			router.post("/resource", postHandler);
			router.put("/resource", putHandler);
			router.path("/resource", patchHandler);
			router.delete("/resource", deleteHandler);

			// Test GET
			await router.handle(
				createMockCTX(HttpMethod.GET, "/resource"),
				createNextFunction(),
			);
			expect(getHandler).toHaveBeenCalled();

			// Test POST
			await router.handle(
				createMockCTX(HttpMethod.POST, "/resource"),
				createNextFunction(),
			);
			expect(postHandler).toHaveBeenCalled();

			// Test PUT
			await router.handle(
				createMockCTX(HttpMethod.PUT, "/resource"),
				createNextFunction(),
			);
			expect(putHandler).toHaveBeenCalled();

			// Test PATCH
			await router.handle(
				createMockCTX(HttpMethod.PATCH, "/resource"),
				createNextFunction(),
			);
			expect(patchHandler).toHaveBeenCalled();

			// Test DELETE
			await router.handle(
				createMockCTX(HttpMethod.DELETE, "/resource"),
				createNextFunction(),
			);
			expect(deleteHandler).toHaveBeenCalled();
		});
	});

	describe("Edge Cases", () => {
		test("should handle root path correctly", async () => {
			const handler = jest.fn();
			router.get("/", handler);

			const ctx = createMockCTX(HttpMethod.GET, "/");
			const next = createNextFunction();

			await router.handle(ctx, next);

			expect(handler).toHaveBeenCalledWith(ctx);
		});

		test("should handle paths with trailing slashes consistently", async () => {
			const handler = jest.fn();
			router.get("/users/", handler);

			const ctx = createMockCTX(HttpMethod.GET, "/users");
			const next = createNextFunction();

			await router.handle(ctx, next);

			expect(handler).toHaveBeenCalledWith(ctx);
		});
	});

	describe("Error Handling", () => {
		test("should throw NotFoundError for unmatched routes", async () => {
			const ctx = createMockCTX(HttpMethod.GET, "/non-existent-route");
			const next = createNextFunction();

			await expect(router.handle(ctx, next)).rejects.toThrow(
				NotFoundError,
			);
		});

		test("should throw NotFoundError for wrong HTTP method", async () => {
			router.get("/users", jest.fn());

			const ctx = createMockCTX(HttpMethod.POST, "/users");
			const next = createNextFunction();

			await expect(router.handle(ctx, next)).rejects.toThrow(
				NotFoundError,
			);
		});
	});
});