/** Mirrors server/src/models/github.model.ts. */

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

export interface GithubStatus {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  owner: string | null;
  repo: string | null;
  branch: string | null;
  toolCount: number | null;
  message: string;
}
