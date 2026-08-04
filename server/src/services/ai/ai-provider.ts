import { CreateStandupInput, SummarySource } from '../../models/standup.model';

export interface SummaryResult {
  summary: string;
  source: SummarySource;
}

/**
 * Optional extra material for the summary.
 *
 * SECURITY: everything in here is **untrusted third-party text**. Commit
 * messages are written by anyone with push access and can contain deliberate
 * prompt-injection attempts. Providers must fence this content and instruct
 * the model to treat it as data, never as instructions.
 */
export interface SummaryContext {
  /** Recent commit subjects, already shortened, e.g. "a1b2c3d Fix login loop". */
  recentCommits: string[];
}

/**
 * A strategy for turning raw standup notes into a polished summary.
 *
 * Keeping this to a single method is what lets the app run identically with or
 * without an API key — the rest of the codebase never learns which one it got.
 */
export interface SummaryProvider {
  readonly source: SummarySource;
  summarize(input: CreateStandupInput, context?: SummaryContext): Promise<string>;
}
