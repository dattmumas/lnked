


/**
 * Centralised HTTP status codes and default error messages.
 * Import these constants anywhere you need an HTTP status
 * to avoid sprinkling numeric literals throughout the codebase.
 */

export enum HttpStatusCode {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  Conflict = 409,
  Gone = 410,
  UnprocessableEntity = 422,
  TooManyRequests = 429,
  InternalServerError = 500,
}

/**
 * Default human‑readable messages keyed by `HttpStatusCode`.
 * You can customise or extend this map as your API evolves.
 */
export const HttpErrorMessages: Record<HttpStatusCode, string> = {
  [HttpStatusCode.BadRequest]: 'Bad Request',
  [HttpStatusCode.Unauthorized]: 'Unauthorized',
  [HttpStatusCode.Forbidden]: 'Forbidden',
  [HttpStatusCode.NotFound]: 'Not Found',
  [HttpStatusCode.Conflict]: 'Conflict',
  [HttpStatusCode.Gone]: 'Gone',
  [HttpStatusCode.UnprocessableEntity]: 'Unprocessable Entity',
  [HttpStatusCode.TooManyRequests]: 'Too Many Requests',
  [HttpStatusCode.InternalServerError]: 'Internal Server Error',
} as const;

/**
 * A thin Error wrapper that carries an HTTP status code.
 * Use this class to throw typed errors in server logic or API handlers.
 */
export class HttpError extends Error {
  constructor(
    public status: HttpStatusCode,
    message: string = HttpErrorMessages[status],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Type‑guard helper for narrowing unknown errors.
 */
export const isHttpError = (err: unknown): err is HttpError =>
  err instanceof HttpError;