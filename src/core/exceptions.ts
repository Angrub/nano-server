export const enum HttpErrorEnum {
  BadRequestError = 'Bad Request',
  UnauthorizedError = 'Unauthorized',
  ForbiddenError = 'Forbidden',
  NotFoundError = 'Not Found',
  ConflictError = 'Conflict',
  UnprocessableEntityError = 'Unprocessable Entity',
  TooManyRequestsError = 'Too Many Requests',
  InternalServerError = 'Internal Server Error',
} 

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 - Bad Request
export class BadRequestError extends HttpError {
  constructor(message: string = HttpErrorEnum.BadRequestError, details?: any) {
    super(400, message, details);
  }
}

// 401 - Unauthorized
export class UnauthorizedError extends HttpError {
  constructor(message: string = HttpErrorEnum.UnauthorizedError, details?: any) {
    super(401, message, details);
  }
}

// 403 - Forbidden
export class ForbiddenError extends HttpError {
  constructor(message: string = HttpErrorEnum.ForbiddenError, details?: any) {
    super(403, message, details);
  }
}

// 404 - Not Found
export class NotFoundError extends HttpError {
  constructor(message: string = HttpErrorEnum.NotFoundError, details?: any) {
    super(404, message, details);
  }
}

// 409 - Conflict
export class ConflictError extends HttpError {
  constructor(message: string = HttpErrorEnum.ConflictError, details?: any) {
    super(409, message, details);
  }
}

// 422 - Unprocessable Entity
export class UnprocessableEntityError extends HttpError {
  constructor(message: string = HttpErrorEnum.UnprocessableEntityError, details?: any) {
    super(422, message, details);
  }
}

// 429 - Too Many Requests
export class TooManyRequestsError extends HttpError {
  constructor(message: string = HttpErrorEnum.TooManyRequestsError, details?: any) {
    super(429, message, details);
  }
}

// 500 - Internal Server Error
export class InternalServerError extends HttpError {
  constructor(message: string = HttpErrorEnum.InternalServerError, details?: any) {
    super(500, message, details);
  }
}
