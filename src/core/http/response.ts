import { IncomingMessage, ServerResponse } from "node:http";

type NodeRes = ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
};

export class NanoResponse {
    private res: NodeRes;
    private status = 200;

    constructor(res: NodeRes) {
        this.res = res;
    }

    public setStatus(statusCode: number) {
        this.status = statusCode;

        return this;
    }

    public text(data: string) {
        this.res.writeHead(this.status, { 'Content-Type': 'text/plain' });
        this.res.end(data);
    }

    public json(data: object) {
        this.res.writeHead(this.status, { 'Content-Type': 'application/json' });
        this.res.end(JSON.stringify(data));
    }

    public hasAnswered() {
        return this.res.writableEnded;
    }
}