import {
	HttpMethod,
	INanoMiddleware,
	NanoCTX,
	NextFunction,
	NotFoundError,
} from "@core";
import { Logger } from "@util";

interface RouteEntry {
	originalPath: string;
	regex: RegExp;
	paramNames: string[];
	handler: RouteHandler;
}

interface MethodRoutes {
	staticRoutes: Map<string, RouteHandler>;
	dynamicRoutes: RouteEntry[];
}

export type RouteHandler = (ctx: NanoCTX) => Promise<void> | void;

export class Router implements INanoMiddleware {
	private logger: Logger;
	private routes: Map<HttpMethod, MethodRoutes> = new Map();
	private routers: Router[] = [];
	public basePath: string = "";

	constructor(path?: string) {
		if (path) {
			this.basePath = this.normalizePath(path);
		}

		this.logger = new Logger(`Router - ${this.basePath}`);
	}

	public get(path: string, handler: RouteHandler) {
		const normalizedPath = this.normalizePath(path);
		this.addRoute(HttpMethod.GET, normalizedPath, handler);
	}

	public post(path: string, handler: RouteHandler) {
		const normalizedPath = this.normalizePath(path);
		this.addRoute(HttpMethod.POST, normalizedPath, handler);
	}

	public put(path: string, handler: RouteHandler) {
		const normalizedPath = this.normalizePath(path);
		this.addRoute(HttpMethod.PUT, normalizedPath, handler);
	}

	public patch(path: string, handler: RouteHandler) {
		const normalizedPath = this.normalizePath(path);
		this.addRoute(HttpMethod.PATCH, normalizedPath, handler);
	}

	public delete(path: string, handler: RouteHandler) {
		const normalizedPath = this.normalizePath(path);
		this.addRoute(HttpMethod.DELETE, normalizedPath, handler);
	}

	public compose(router: Router) {
		this.routers.push(router);
	}

	private addRoute(method: HttpMethod, path: string, handler: RouteHandler) {
		if (!this.routes.has(method)) {
			this.routes.set(method, {
				staticRoutes: new Map(),
				dynamicRoutes: [],
			});
		}

		const methodRoutes = this.routes.get(method)!;
		const subpath = this.basePath + path;

		if (!path.includes(":")) {
			methodRoutes.staticRoutes.set(subpath, handler);
		} else {
			const { regex, paramNames } = this.pathToRegex(subpath);
			methodRoutes.dynamicRoutes.push({
				originalPath: subpath,
				regex,
				paramNames,
				handler,
			});
		}
	}

	private normalizePath(path: string) {
		if (path === "" || path === "/") return "";

		let normalizedPath = path.startsWith("/") ? path : "/" + path;

		if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
			normalizedPath = normalizedPath.slice(0, -1);
		}

		return normalizedPath;
	}

	private pathToRegex(path: string) {
		const paramNames: string[] = [];

		const regexStr = path
			.split("/")
			.map((segment) => {
				if (segment.startsWith(":")) {
					paramNames.push(segment.slice(1));
					return "([^/]+)";
				}
				return segment;
			})
			.join("/");

		const regex = new RegExp(`^${regexStr}$`);

		return { regex, paramNames };
	}

	public async handle(ctx: NanoCTX, next: NextFunction) {
		const { handler, params } = this.match(
			ctx.request.method,
			ctx.request.path,
			ctx.request.originalPath,
		);

		ctx.request.params = params;

		if (handler instanceof Router) {
			// remove base path
			const remainingPath = ctx.request.path.slice(this.basePath.length);
			ctx.request.path = remainingPath === "" ? "/" : remainingPath;

			await handler.handle(ctx, next);
			return;
		}

		await handler(ctx);
	}

	private match(method: HttpMethod, path: string, originalPath: string) {
		const methodRoutes = this.routes.get(method);

		if (methodRoutes) {
			// handle root path specifically
			if (path === "/") path = "";

			// if static
			const staticHandler = methodRoutes.staticRoutes.get(path);
			if (staticHandler) {
				return { handler: staticHandler, params: {} };
			}

			// if dynamic
			for (const route of methodRoutes.dynamicRoutes) {
				const match = path.match(route.regex);
				if (match) {
					return this.extractParams(route, match);
				}
			}
		}

		// search by router
		for (const router of this.routers) {
			const routerFullPath = this.basePath + router.basePath;

			// Ahora que path es "" para root, podemos simplificar
			if (
				path.startsWith(routerFullPath) ||
				(routerFullPath === "" && path === "")
			) {
				return { handler: router, params: {} };
			}

			// Verificación adicional para cuando el padre no tiene basePath
			if (this.basePath === "" && path.startsWith(router.basePath)) {
				return { handler: router, params: {} };
			}
		}

		throw new NotFoundError(
			`Route not found ${method} ${originalPath}`,
		);
	}

	private extractParams(entry: RouteEntry, match: RegExpMatchArray) {
		const params: Record<string, string> = {};
		entry.paramNames.forEach((name, i) => {
			params[name] = match[i + 1]!;
		});

		return { handler: entry.handler, params };
	}
}
