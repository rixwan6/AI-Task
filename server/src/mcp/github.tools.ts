import {
  GithubCommit,
  GithubIssue,
  GithubPullRequest,
  GithubRepository,
} from '../models/github.model';

/**
 * Tool names exposed by GitHub's MCP server. Centralised so a rename upstream
 * is a one-line change, and so the client can check they exist via tools/list.
 */
export const GITHUB_TOOLS = {
  listCommits: 'list_commits',
  listPullRequests: 'list_pull_requests',
  listIssues: 'list_issues',
  searchRepositories: 'search_repositories',
  getMe: 'get_me',
} as const;

/**
 * MCP returns tool output as an array of content blocks, not typed JSON — a
 * JSON payload arrives as a *string* inside a text block. This unwraps that.
 *
 * This is the main ergonomic difference from calling the REST API directly,
 * where the response is already typed JSON.
 */
export function parseToolResult(result: unknown): unknown {
  if (!isRecord(result)) {
    throw new Error('MCP returned an unexpected result shape.');
  }

  const content = result['content'];
  const text = Array.isArray(content) ? findFirstText(content) : null;

  // isError means the tool ran but failed; the text block holds the reason.
  if (result['isError'] === true) {
    throw new Error(text ?? 'MCP tool reported an error.');
  }

  if (text === null) {
    throw new Error('MCP result contained no text content.');
  }

  try {
    return JSON.parse(text);
  } catch {
    // Not every tool returns JSON; hand back the raw text so callers can decide.
    return text;
  }
}

function findFirstText(content: unknown[]): string | null {
  for (const block of content) {
    if (isRecord(block) && block['type'] === 'text' && typeof block['text'] === 'string') {
      return block['text'];
    }
  }
  return null;
}

/**
 * Tool payloads are sometimes a bare array and sometimes an object wrapping one
 * (`items`, `results`, …). Normalising here keeps the mappers simple.
 */
export function toArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (isRecord(payload)) {
    for (const key of ['items', 'results', 'commits', 'pull_requests', 'issues']) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
    }
  }

  return [];
}

export function toCommits(payload: unknown, limit: number): GithubCommit[] {
  return toArray(payload)
    .filter(isRecord)
    .slice(0, limit)
    .map((raw): GithubCommit => {
      const sha = str(raw['sha']) ?? '';
      const commit = isRecord(raw['commit']) ? raw['commit'] : {};
      const commitAuthor = isRecord(commit['author']) ? commit['author'] : {};
      const topAuthor = isRecord(raw['author']) ? raw['author'] : {};

      return {
        sha,
        shortSha: sha.slice(0, 7),
        // Commit bodies can be long; the first line is the subject.
        message: firstLine(str(commit['message']) ?? ''),
        author: str(topAuthor['login']) ?? str(commitAuthor['name']),
        url: str(raw['html_url']) ?? '',
        committedAt: str(commitAuthor['date']),
      };
    });
}

export function toPullRequests(payload: unknown, limit: number): GithubPullRequest[] {
  return toArray(payload)
    .filter(isRecord)
    .slice(0, limit)
    .map((raw): GithubPullRequest => ({
      number: num(raw['number']) ?? 0,
      title: str(raw['title']) ?? '(untitled)',
      author: str(isRecord(raw['user']) ? raw['user']['login'] : undefined),
      url: str(raw['html_url']) ?? '',
      createdAt: str(raw['created_at']),
      isDraft: raw['draft'] === true,
    }));
}

export function toIssues(payload: unknown, limit: number): GithubIssue[] {
  return toArray(payload)
    .filter(isRecord)
    // GitHub's issues API returns pull requests too — they carry a
    // `pull_request` key. Without this filter the issues list is polluted.
    .filter((raw) => raw['pull_request'] === undefined)
    .slice(0, limit)
    .map((raw): GithubIssue => ({
      number: num(raw['number']) ?? 0,
      title: str(raw['title']) ?? '(untitled)',
      author: str(isRecord(raw['user']) ? raw['user']['login'] : undefined),
      url: str(raw['html_url']) ?? '',
      createdAt: str(raw['created_at']),
      labels: toLabels(raw['labels']),
    }));
}

export function toRepository(payload: unknown): GithubRepository | null {
  const first = toArray(payload).filter(isRecord)[0] ?? (isRecord(payload) ? payload : null);
  if (!first) return null;

  return {
    fullName: str(first['full_name']) ?? '',
    description: str(first['description']),
    defaultBranch: str(first['default_branch']),
    openIssues: num(first['open_issues_count']),
    stars: num(first['stargazers_count']),
    url: str(first['html_url']) ?? '',
  };
}

function toLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((label) => (typeof label === 'string' ? label : isRecord(label) ? str(label['name']) : null))
    .filter((name): name is string => Boolean(name));
}

function firstLine(text: string): string {
  return text.split('\n')[0]?.trim() ?? '';
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
