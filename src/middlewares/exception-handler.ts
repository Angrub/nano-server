import {
	HttpError,
	HttpErrorEnum,
	NanoCTX,
	INanoMiddleware,
	NextFunction,
} from "@core";
import { Logger } from "@util";

export class ExceptionHandler implements INanoMiddleware {
	private ctx = {} as NanoCTX;
	private logger = new Logger('Exception-Handler');

	public async handle(ctx: NanoCTX, next: NextFunction) {
		// this.logger.info('check!')
		try {
			this.ctx = ctx;
			await next();
		} catch (error) {
			if (error instanceof HttpError) {
				this.handleHttpError(error);
				return;
			}

			this.sendDefaultError();
		}
	}

	private handleHttpError(error: HttpError) {
		if (error.statusCode >= 400 && error.statusCode < 500) {
			this.ctx.response.setStatus(error.statusCode).json({
				status: error.statusCode,
				message: error.message,
			});

			return;
		}

		this.sendDefaultError();
	}

	private sendDefaultError() {
		this.ctx.response.setStatus(500).json({
			status: 500,
			message: HttpErrorEnum.InternalServerError,
		});
	}
}
