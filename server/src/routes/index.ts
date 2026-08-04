import { Router } from 'express';
import { getHealth } from '../controllers/health.controller';
import { githubRouter } from './github.routes';
import { standupRouter } from './standup.routes';

/** Mounted at /api by the app, so these paths are /api/health, /api/standups, … */
export const apiRouter = Router();

apiRouter.get('/health', getHealth);
apiRouter.use('/standups', standupRouter);
// Optional feature. Its routes always exist; they report "disabled" rather
// than 404 when MCP is switched off, which is easier to diagnose.
apiRouter.use('/github', githubRouter);
