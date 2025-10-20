import * as http from "node:http";
import { Logger } from "@util";
import { BodyParser, ExceptionHandler, RequesLogger } from "@middlewares";

import { NanoRequest, NanoResponse } from ".";

import { HttpErrorEnum, NanoCTX, INanoMiddleware } from "..";

import { NanoServerLogo } from "@/logo";

interface HttpServerConfig {
	port?: number;
	cors?: string | string[];
	logs?: boolean;
}

interface INanoServer {
	listen: () => void;
}

export class NanoHttpServer implements INanoServer {
	private PORT;
	private CORS;
	private logger = new Logger("Nano Server");
	private middlewares: INanoMiddleware[] = [];

	constructor(config?: HttpServerConfig) {
		this.PORT = config?.port ?? 3000;
		this.CORS = config?.cors ?? "*";

		this.createBaseMiddlewares(config?.logs);
	}

	private createBaseMiddlewares(loggerMW = false) {
		this.middlewares.push(new ExceptionHandler(), new BodyParser());

		if (loggerMW) this.middlewares.push(new RequesLogger());
	}

	public add(mw: INanoMiddleware) {
		this.middlewares.push(mw);
	}

	private compose(middlewares: INanoMiddleware[]) {
		return function (ctx: NanoCTX) {
			function dispatch(i: number): Promise<void> {
				return new Promise((resolve, reject) => {
					const middleware = middlewares[i];
					if (!middleware) return resolve();

					return resolve(
						middleware.handle(ctx, () => dispatch(i + 1)),
					);
				});
			}

			return dispatch(0);
		};
	}

	public listen() {
		const server = http.createServer(async (req, res) => {
			const context: NanoCTX = {
				request: new NanoRequest(req),
				response: new NanoResponse(res),
				payload: {},
			};

			const start = this.compose(this.middlewares);

			try {
				await start(context);

				if (!context.response.hasAnswered()) {
					context.response
						.setStatus(404)
						.json({ message: HttpErrorEnum.NotFoundError });
				}
			} catch (error) {
				this.logger.error(error);

				if (!context.response.hasAnswered()) {
					context.response
						.setStatus(500)
						.json({ message: HttpErrorEnum.InternalServerError });
				}
			}
		});

		server.listen(this.PORT, () => {
			console.clear();
			this.logger.server(`Thanks for use nano server!`);
			this.logger.success(`Running on port ${this.PORT}! :D`);
			console.log(NanoServerLogo);
		});
	}
}
