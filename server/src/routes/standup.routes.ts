import { Router } from 'express';
import { createStandup, listStandups } from '../controllers/standup.controller';
import { asyncHandler } from '../utils/async-handler';

export const standupRouter = Router();

standupRouter.get('/', asyncHandler(listStandups));
standupRouter.post('/', asyncHandler(createStandup));
