// jwt.util.ts
import jwt, { SignOptions, VerifyOptions, JwtPayload } from "jsonwebtoken";

export class Jwt {

	public static sign<T extends object>(
		payload: T,
        secret: string,
		options: SignOptions = {},
	): string {
        const token = jwt.sign(payload, secret, options);
        return token;
	}

	public static verify<T extends object = JwtPayload>(
		token: string,
        secret: string,
		options: VerifyOptions = {},
	): T {
        const decoded = jwt.verify(token, secret, options);
        return decoded as T;
	}

	public static decode(token: string): null | JwtPayload | string {
		try {
			return jwt.decode(token);
		} catch {
			return null;
		}
	}
}
