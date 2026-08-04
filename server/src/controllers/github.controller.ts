import { Request, Response } from 'express';
import { ApiResponse } from '../models/api.model';
import {
  GithubCommit,
  GithubIssue,
  GithubPullRequest,
  GithubRepository,
  GithubStatus,
} from '../models/github.model';
import { githubService } from '../mcp/github.service';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Always 200, even when the integration is off — reporting "disabled" is this
 * endpoint's success case, and the UI calls it to decide whether to render the
 * GitHub panel at all.
 */
export async function getGithubStatus(
  _req: Request,
  res: Response<ApiResponse<GithubStatus>>,
): Promise<void> {
  const status = await githubService.getStatus();
  res.status(200).json({ success: true, data: status });
}

export async function getGithubCommits(
  req: Request,
  res: Response<ApiResponse<GithubCommit[]>>,
): Promise<void> {
  const commits = await githubService.getCommits(readLimit(req));
  res.status(200).json({ success: true, data: commits });
}

export async function getGithubPullRequests(
  req: Request,
  res: Response<ApiResponse<GithubPullRequest[]>>,
): Promise<void> {
  const pullRequests = await githubService.getPullRequests(readLimit(req));
  res.status(200).json({ success: true, data: pullRequests });
}

export async function getGithubIssues(
  req: Request,
  res: Response<ApiResponse<GithubIssue[]>>,
): Promise<void> {
  const issues = await githubService.getIssues(readLimit(req));
  res.status(200).json({ success: true, data: issues });
}

export async function getGithubRepository(
  _req: Request,
  res: Response<ApiResponse<GithubRepository | null>>,
): Promise<void> {
  const repository = await githubService.getRepository();
  res.status(200).json({ success: true, data: repository });
}

/**
 * `limit` is the only caller-supplied input on these routes — owner and repo
 * come from configuration. Clamped rather than rejected, so a silly value
 * degrades instead of erroring.
 */
function readLimit(req: Request): number {
  const parsed = Number.parseInt(String(req.query['limit'] ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}
