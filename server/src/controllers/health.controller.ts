import { Request, Response } from 'express';
import { ApiResponse } from '../models/api.model';
import { SummarySource } from '../models/standup.model';
import { activeProviderSource } from '../services/ai';

export interface HealthStatus {
  status: 'ok';
  /** Surfaced so you can tell at a glance whether the API key was picked up. */
  aiProvider: SummarySource;
  uptimeSeconds: number;
}

export function getHealth(_req: Request, res: Response<ApiResponse<HealthStatus>>): void {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      aiProvider: activeProviderSource,
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
}
