/**
 * Mirrors the server contract in server/src/models. Kept in sync by hand — in
 * a monorepo this would live in a shared package imported by both sides.
 */

export type SummarySource = 'ai' | 'mock';

export interface Standup {
  id: string;
  yesterday: string;
  today: string;
  blockers: string | null;
  summary: string;
  summarySource: SummarySource;
  createdAt: string;
}

export interface CreateStandupRequest {
  yesterday: string;
  today: string;
  blockers?: string;
}

export interface ApiError {
  message: string;
  details?: string[];
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
