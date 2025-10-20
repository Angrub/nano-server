import {
	INanoMiddleware,
	NanoCTX,
	NextFunction,
	UnauthorizedError,
	HttpErrorEnum,
} from "@core";
import { Logger, Jwt } from "@util";

export interface JWTGuardOptions {
	secret?: string;
	excludePaths?: string[];
}

export class JWTGuard implements INanoMiddleware {
	private readonly secret: string;
	private readonly excludePaths: string[];
	private readonly logger = new Logger("Auth-Middleware");

	constructor(opts: JWTGuardOptions = {}) {
		this.secret =
			opts.secret || process.env.JWT_SECRET || "change_me_secret";
		this.excludePaths = opts.excludePaths || [];
	}

	public async handle(ctx: NanoCTX, next: NextFunction) {

        if (this.isExcludedPath(ctx.request.path)) {
            return await next();
        }

        const authHeader = ctx.request.getHeader("authorization")

        if (!authHeader) {
            throw new UnauthorizedError(HttpErrorEnum.UnauthorizedError);
        }

        const rawHeader = Array.isArray(authHeader)
            ? authHeader[0]
            : authHeader;

        if (!rawHeader?.startsWith("Bearer ")) {
            throw new UnauthorizedError("Missing Bearer token");
        }

        const token = rawHeader.split(" ")[1] || '';

        try {
            ctx.payload = Jwt.verify(token, this.secret);
        } catch (err) {
            throw new UnauthorizedError("Invalid or expired token");
        }

        await next();
	}

	private isExcludedPath(path: string) {
		if (!this.excludePaths || !this.excludePaths.length) return false;
		return this.excludePaths.includes(path);
	}
}
