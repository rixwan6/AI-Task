/**
 * An error carrying the HTTP status it should produce. The error middleware
 * treats anything that is *not* an AppError as an unexpected 500, which keeps
 * internal failure messages from leaking to clients.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: string[]): AppError {
    return new AppError(400, message, details);
  }

  static notFound(message: string): AppError {
    return new AppError(404, message);
  }

  /** An upstream dependency failed — the fault is not the client's. */
  static badGateway(message: string): AppError {
    return new AppError(502, message);
  }

  /** The feature is switched off or not configured. */
  static serviceUnavailable(message: string): AppError {
    return new AppError(503, message);
  }
}
