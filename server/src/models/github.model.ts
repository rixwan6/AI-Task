/**
 * Trimmed-down GitHub shapes.
 *
 * Deliberately not the raw API payloads: the MCP server returns large objects,
 * and the UI needs a handful of fields. Mapping here keeps the API response
 * small and means a change in GitHub's payload shape is absorbed in one place.
 */

export interface GithubCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string | null;
  url: string;
  committedAt: string | null;
}

export interface GithubPullRequest {
  number: number;
  title: string;
  author: string | null;
  url: string;
  createdAt: string | null;
  isDraft: boolean;
}

export interface GithubIssue {
  number: number;
  title: string;
  author: string | null;
  url: string;
  createdAt: string | null;
  labels: string[];
}

export interface GithubRepository {
  fullName: string;
  description: string | null;
  defaultBranch: string | null;
  openIssues: number | null;
  stars: number | null;
  url: string;
}

/**
 * Reported by GET /api/github/status. The three booleans are deliberately
 * separate so a misconfiguration is diagnosable rather than just "not working":
 * enabled but not configured is a different problem from configured but not
 * connecting.
 */
export interface GithubStatus {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  owner: string | null;
  repo: string | null;
  branch: string | null;
  /** Tool count from the MCP `tools/list` handshake — proves discovery worked. */
  toolCount: number | null;
  message: string;
}
