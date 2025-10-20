import {
	INanoMiddleware,
	NanoCTX,
	NextFunction,
	MessagingService,
} from "@core";

export interface MessagingCTX<Payload>
	extends NanoCTX<any, any, any, { messaging: MessagingService, } & Payload> {}

export class MessagingMiddleware implements INanoMiddleware {
	constructor(private messagingService: MessagingService) {}

	public async handle(ctx: MessagingCTX<any>, next: NextFunction): Promise<void> {
		ctx.payload.messaging = this.messagingService;
		await next();
	}
}
