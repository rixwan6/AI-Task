import { ErrorRequestHandler } from 'express';
import { ApiResponse } from '../models/api.model';
import { AppError } from '../utils/app-error';

/**
 * The single place an error becomes a response.
 *
 * Deliberate expectations we control get their message forwarded; anything
 * unrecognised is logged server-side and reported as a bare 500, so stack
 * traces and internal details never reach a client.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    const body: ApiResponse<never> = {
      success: false,
      error: {
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  if (isMalformedJson(error)) {
    res.status(400).json({
      success: false,
      error: { message: 'Request body is not valid JSON.' },
    });
    return;
  }

  console.error('[error] Unhandled failure:', error);
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error.' },
  });
};

/** express.json() reports a bad payload as a SyntaxError carrying a 400 status. */
function isMalformedJson(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: unknown }).status === 400 &&
    'body' in error
  );
}
