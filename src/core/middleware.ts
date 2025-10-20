import { NanoRequest, NanoResponse } from "./http";

export interface NanoCTX<Params = any, QueryParams = any, Body = any, Payload = any> {
	request: NanoRequest<Params, QueryParams, Body>;
	response: NanoResponse;
	payload: Payload;
}

export type NextFunction = () => Promise<void>;

export interface INanoMiddleware {
	handle: (ctx: NanoCTX, next: NextFunction) => Promise<void>;
}
