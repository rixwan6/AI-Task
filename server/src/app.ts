import cors from 'cors';
import express, { Express } from 'express';
import { config } from './config/env';
import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found';
import { apiRouter } from './routes';

/**
 * Builds the Express app without starting it, so tests can drive it in-process
 * (e.g. with supertest) without binding a port.
 */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  // Standups are three short text fields; a small cap keeps oversized payloads
  // from being parsed at all.
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', apiRouter);

  // Order matters: unmatched routes become a 404 AppError, and every error
  // then funnels through the one handler below.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
