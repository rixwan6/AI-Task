import { randomUUID } from 'node:crypto';
import { githubService } from '../mcp/github.service';
import { CreateStandupInput, Standup } from '../models/standup.model';
import { StandupRepository, standupRepository } from '../repositories/standup.repository';
import { SummaryContext, summarizeStandup } from './ai';

/** Enough commits to add detail without dominating the prompt. */
const COMMIT_CONTEXT_LIMIT = 5;

/**
 * Orchestrates the one workflow this app has: summarise a standup, then store
 * the original and the summary together.
 *
 * The repository is injected (with a default) so this class can be unit tested
 * against an in-memory stub without touching the filesystem.
 */
export class StandupService {
  constructor(private readonly repository: StandupRepository = standupRepository) {}

  listStandups(): Promise<Standup[]> {
    return this.repository.findAll();
  }

  async createStandup(input: CreateStandupInput): Promise<Standup> {
    const context = await this.buildGithubContext();
    const { summary, source } = await summarizeStandup(input, context);

    return this.repository.create({
      id: randomUUID(),
      yesterday: input.yesterday,
      today: input.today,
      blockers: input.blockers,
      summary,
      summarySource: source,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * The single point where the standup flow touches the optional MCP feature.
   *
   * `getCommitsForContext` never throws — it returns an empty array when GitHub
   * is disabled, unconfigured, or unreachable — so a GitHub problem can never
   * fail a standup submission. Undefined here means "summarise from the notes
   * alone", which is exactly the pre-MCP behaviour.
   */
  private async buildGithubContext(): Promise<SummaryContext | undefined> {
    const commits = await githubService.getCommitsForContext(COMMIT_CONTEXT_LIMIT);

    if (commits.length === 0) {
      return undefined;
    }

    return {
      recentCommits: commits.map((commit) => `${commit.shortSha} ${commit.message}`),
    };
  }
}

export const standupService = new StandupService();
