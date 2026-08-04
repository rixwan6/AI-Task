import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not forward rejected promises to error middleware — an
 * unhandled rejection in a handler leaves the request hanging until it times
 * out. Wrapping async handlers routes those failures through `next` so they
 * reach the error handler like any other error.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
