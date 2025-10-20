// body-parser.ts
import { INanoMiddleware, NanoCTX, NextFunction } from "@core";

export class BodyParser implements INanoMiddleware {
    public async handle(ctx: NanoCTX, next: NextFunction) {
        const { request } = ctx;

        if (this.shouldParseBody(request.method)) {
            const contentType = request.getHeader('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                await this.parseJsonBody(ctx);
            }
            // TODO: add more parsers
        }

        await next();
    }

    private shouldParseBody(method: string): boolean {
        return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    }

    private async parseJsonBody(ctx: NanoCTX): Promise<void> {
        try {
            const bodyString = await ctx.request.readBodyAsString();
            
            if (bodyString.trim()) {
                ctx.request.body = JSON.parse(bodyString);
            } else {
                ctx.request.body = {} as any;
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid JSON in request body');
            }
            throw error;
        }
    }
}