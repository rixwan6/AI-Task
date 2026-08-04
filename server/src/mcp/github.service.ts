import {
  GithubCommit,
  GithubIssue,
  GithubPullRequest,
  GithubRepository,
  GithubStatus,
} from '../models/github.model';
import { AppError } from '../utils/app-error';
import { GithubMcpClient, githubMcpClient } from './github.client';
import { GithubMcpConfig, githubConfig, isGithubConfigured, missingGithubSettings } from './github.config';
import {
  GITHUB_TOOLS,
  toCommits,
  toIssues,
  toPullRequests,
  toRepository,
} from './github.tools';

const DEFAULT_LIMIT = 10;

/**
 * Business logic for the GitHub integration.
 *
 * Note that `owner` and `repo` always come from configuration and are never
 * accepted from the caller. Taking them from the request would turn this into
 * an authenticated proxy that fetches any repository the token can see, on
 * behalf of anyone who can reach the API.
 */
export class GithubService {
  constructor(
    private readonly client: GithubMcpClient = githubMcpClient,
    private readonly config: GithubMcpConfig = githubConfig,
  ) {}

  /**
   * Never throws — a status endpoint that fails is useless for diagnosis.
   * The three booleans distinguish "switched off" from "misconfigured" from
   * "configured but the connection is broken".
   */
  async getStatus(): Promise<GithubStatus> {
    const base = {
      enabled: this.config.enabled,
      configured: isGithubConfigured(this.config),
      owner: this.config.owner,
      repo: this.config.repo,
      branch: this.config.branch,
    };

    if (!this.config.enabled) {
      return { ...base, connected: false, toolCount: null, message: 'MCP_ENABLED is not set to true.' };
    }

    if (!base.configured) {
      const missing = missingGithubSettings(this.config).join(', ');
      return { ...base, connected: false, toolCount: null, message: `Missing configuration: ${missing}.` };
    }

    try {
      const tools = await this.client.listToolNames();
      return {
        ...base,
        connected: true,
        toolCount: tools.length,
        message: `Connected. ${tools.length} tools available.`,
      };
    } catch (error) {
      return {
        ...base,
        connected: false,
        toolCount: null,
        message: describe(error),
      };
    }
  }

  async getCommits(limit = DEFAULT_LIMIT): Promise<GithubCommit[]> {
    const payload = await this.call(GITHUB_TOOLS.listCommits, {
      ...this.repoArgs(),
      // `sha` accepts a branch name; omitted means the default branch.
      ...(this.config.branch ? { sha: this.config.branch } : {}),
      perPage: limit,
      // Ask only for the fields we map — keeps the payload small.
      fields: ['sha', 'html_url', 'commit', 'author'],
    });

    return toCommits(payload, limit);
  }

  async getPullRequests(limit = DEFAULT_LIMIT): Promise<GithubPullRequest[]> {
    const payload = await this.call(GITHUB_TOOLS.listPullRequests, {
      ...this.repoArgs(),
      state: 'open',
      sort: 'created',
      direction: 'desc',
      perPage: limit,
      fields: ['number', 'title', 'draft', 'html_url', 'user', 'created_at'],
    });

    return toPullRequests(payload, limit);
  }

  async getIssues(limit = DEFAULT_LIMIT): Promise<GithubIssue[]> {
    const payload = await this.call(GITHUB_TOOLS.listIssues, {
      ...this.repoArgs(),
      // Deliberately uppercase: list_issues is GraphQL-backed and takes
      // OPEN/CLOSED, unlike list_pull_requests which takes open/closed.
      state: 'OPEN',
      orderBy: 'CREATED_AT',
      direction: 'DESC',
      perPage: limit,
      fields: ['number', 'title', 'user', 'labels', 'created_at'],
    });

    return toIssues(payload, limit);
  }

  async getRepository(): Promise<GithubRepository | null> {
    const payload = await this.call(GITHUB_TOOLS.searchRepositories, {
      query: `repo:${this.config.owner}/${this.config.repo}`,
      // Defaults to true, which strips the fields we need.
      minimal_output: false,
      perPage: 1,
    });

    return toRepository(payload);
  }

  /**
   * Commits for the AI summary. Returns an empty array instead of throwing —
   * GitHub context is an enhancement, and losing it must never fail a standup.
   */
  async getCommitsForContext(limit: number): Promise<GithubCommit[]> {
    if (!isGithubConfigured(this.config)) {
      return [];
    }

    try {
      return await this.getCommits(limit);
    } catch (error) {
      console.warn(`[github] Skipping commit context. Reason: ${describe(error)}`);
      return [];
    }
  }

  private repoArgs(): Record<string, unknown> {
    return { owner: this.config.owner, repo: this.config.repo };
  }

  private async call(tool: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.config.enabled) {
      throw AppError.serviceUnavailable('GitHub integration is disabled. Set MCP_ENABLED=true.');
    }

    if (!isGithubConfigured(this.config)) {
      const missing = missingGithubSettings(this.config).join(', ');
      throw AppError.serviceUnavailable(`GitHub integration is missing configuration: ${missing}.`);
    }

    try {
      return await this.client.callTool(tool, args);
    } catch (error) {
      // The upstream failed, not the caller — 502 rather than 500 or 400.
      throw AppError.badGateway(`GitHub MCP request failed: ${describe(error)}`);
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const githubService = new GithubService();
