import { Request, Response } from 'express';
import { ApiResponse } from '../models/api.model';
import { Standup } from '../models/standup.model';
import { standupService } from '../services/standup.service';
import { parseCreateStandupInput } from '../utils/validation';

/**
 * Controllers do HTTP only: read the request, delegate, choose a status code.
 * Validation failures throw and are formatted by the error middleware, so
 * there is no error handling to duplicate here.
 */
export async function listStandups(
  _req: Request,
  res: Response<ApiResponse<Standup[]>>,
): Promise<void> {
  const standups = await standupService.listStandups();
  res.status(200).json({ success: true, data: standups });
}

export async function createStandup(
  req: Request,
  res: Response<ApiResponse<Standup>>,
): Promise<void> {
  const input = parseCreateStandupInput(req.body);
  const standup = await standupService.createStandup(input);
  res.status(201).json({ success: true, data: standup });
}
