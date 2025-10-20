import { JWTGuard } from "@middlewares/jwt-guard";
import { UnauthorizedError } from "@core";
import { Jwt } from "@util";

describe("JWTGuard Middleware", () => {
	let jwtGuard: JWTGuard;
	let ctx: any;
	let next: jest.Mock;

	beforeEach(() => {
		jwtGuard = new JWTGuard({ secret: "test_secret" });
		next = jest.fn().mockResolvedValue(undefined);

		ctx = {
			request: {
				path: "/protected",
				getHeader: jest.fn(),
			},
			response: {},
		};
	});

	describe("Excluded paths", () => {
		test("should skip JWT validation for excluded paths", async () => {
			const guard = new JWTGuard({ excludePaths: ["/public"] });
			ctx.request.path = "/public";
			await guard.handle(ctx, next);
			expect(next).toHaveBeenCalled();
		});
	});

	describe("Authorization header validation", () => {
		test("should throw if Authorization header is missing", async () => {
			ctx.request.getHeader.mockReturnValue(undefined);

			await expect(jwtGuard.handle(ctx, next)).rejects.toThrow(UnauthorizedError);
			expect(next).not.toHaveBeenCalled();
		});

		test("should throw if Authorization header is not Bearer", async () => {
			ctx.request.getHeader.mockReturnValue("Basic abc123");

			await expect(jwtGuard.handle(ctx, next)).rejects.toThrow("Missing Bearer token");
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe("Token validation", () => {
		beforeEach(() => {
			jest.spyOn(Jwt, "verify").mockReset();
		});

		test("should throw if token is invalid", async () => {
			ctx.request.getHeader.mockReturnValue("Bearer invalid.token");
			jest.spyOn(Jwt, "verify").mockImplementation(() => {
				throw new Error("Invalid token");
			});

			await expect(jwtGuard.handle(ctx, next)).rejects.toThrow(UnauthorizedError);
			expect(Jwt.verify).toHaveBeenCalledWith("invalid.token", "test_secret");
			expect(next).not.toHaveBeenCalled();
		});

		test("should call next if token is valid", async () => {
			const mockPayload = { id: 1, role: "admin" };
			ctx.request.getHeader.mockReturnValue("Bearer valid.token");

			jest.spyOn(Jwt, "verify").mockReturnValue(mockPayload as any);

			await jwtGuard.handle(ctx, next);

			expect(Jwt.verify).toHaveBeenCalledWith("valid.token", "test_secret");
			expect(ctx.payload).toEqual(mockPayload);
			expect(next).toHaveBeenCalled();
		});
	});

	describe("Secret configuration", () => {
		test("should use custom secret if provided", async () => {
			const guard = new JWTGuard({ secret: "custom_secret" });
			ctx.request.getHeader.mockReturnValue("Bearer valid.token");
			const spy = jest.spyOn(Jwt, "verify").mockReturnValue({} as any);

			await guard.handle(ctx, next);

			expect(spy).toHaveBeenCalledWith("valid.token", "custom_secret");
			expect(next).toHaveBeenCalled();
		});
	});
});
