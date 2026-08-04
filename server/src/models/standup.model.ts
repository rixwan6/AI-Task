/**
 * Which provider produced a summary. Persisted (and surfaced in the UI) so a
 * fallback summary is never silently passed off as AI-generated output.
 */
export type SummarySource = 'ai' | 'mock';

/** A persisted standup: the original entry plus its generated summary. */
export interface Standup {
  id: string;
  yesterday: string;
  today: string;
  blockers: string | null;
  summary: string;
  summarySource: SummarySource;
  createdAt: string;
}

/** A validated, normalised submission. `blockers` is null when omitted. */
export interface CreateStandupInput {
  yesterday: string;
  today: string;
  blockers: string | null;
}
