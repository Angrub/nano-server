import { HttpMethod, INanoMiddleware, NanoCTX, NextFunction } from "@core";
import { Colors, Logger } from "@util";

export class RequesLogger implements INanoMiddleware {
	private logger = new Logger("Request");

	public async handle(ctx: NanoCTX, next: NextFunction) {
		const { method, originalPath } = ctx.request;

		if (this.shouldParseBody(method)) {
			this.logger.info(
				`${this.colorHttpMethod(method)} - ${Colors.bright}${originalPath}${Colors.reset}`,
			);
		}

		await next();
	}

	private shouldParseBody(method: string): boolean {
		return ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method);
	}

	private colorHttpMethod(method: HttpMethod) {
		switch (method) {
			case HttpMethod.GET:
				return `${Colors.bgGreen}${Colors.white}${Colors.bright} ${method} ${Colors.reset}`;
			case HttpMethod.POST:
				return `${Colors.bgBlue}${Colors.white}${Colors.bright} ${method} ${Colors.reset}`;
			case HttpMethod.PUT:
				return `${Colors.bgMagenta}${Colors.white}${Colors.bright} ${method} ${Colors.reset}`;
			case HttpMethod.PATCH:
				return `${Colors.bgYellow}${Colors.white}${Colors.bright} ${method} ${Colors.reset}`;
			case HttpMethod.DELETE:
				return `${Colors.bgRed}${Colors.white}${Colors.bright} ${method} ${Colors.reset}`;
			default:
				return method;
		}
	}
}
