import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/app-error';

/**
 * Converts an unmatched route into a 404 AppError so that misses are formatted
 * by the same error handler as everything else, rather than falling through to
 * Express's default HTML error page.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found.`));
}
