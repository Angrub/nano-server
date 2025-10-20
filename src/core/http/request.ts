import { IncomingMessage } from "node:http";

export enum HttpMethod {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
	OPTIONS = "OPTIONS",
	HEAD = "HEAD",
}

export class NanoRequest<Params = any, QueryParams = any, Body = any> {
	private req: IncomingMessage;

	public method: HttpMethod;
	public originalPath: string;
	public path: string;

	public params: Params = {} as Params;
	public query: QueryParams = {} as QueryParams;
	public body: Body = {} as Body;

	constructor(req: IncomingMessage) {
		this.req = req;
		this.method = req.method! as HttpMethod;

		const { query, path } = this.parseUrl(req);
		this.originalPath = path;
		this.path = path;
		this.query = query;
	}

	private parseUrl(req: IncomingMessage) {
		const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
		const query: any = Object.fromEntries(parsedUrl.searchParams);
		const path = parsedUrl.pathname;

		return { path, query };
	}

	public async readBodyAsString(): Promise<string> {
		return new Promise((resolve, reject) => {
			let data = "";
			this.req.on("data", (chunk) => {
				data += chunk.toString();
			});
			this.req.on("end", () => {
				resolve(data);
			});
			this.req.on("error", reject);
		});
	}

	public getHeader(header: string) {
		return this.req.headers[header];
	}

	public setHeader(header: string, value: string | string[]) {
		this.req.headers[header] = value;
	}

	public addHeaderValue(header: string, value: string | string[]) {
        header.toLowerCase();

		if (!this.req.headers[header]) {
			this.req.headers[header] = value;
		} else if (Array.isArray(this.req.headers[header])) {
			if (Array.isArray(value)) {
				this.req.headers[header].push(...value);
			} else {
                this.req.headers[header].push(value)
            };
		} else {
			if (Array.isArray(value)) {
				this.req.headers[header] = [this.req.headers[header], ...value];
            } else {
				this.req.headers[header] = [this.req.headers[header], value];
            }
		}
	}
}
