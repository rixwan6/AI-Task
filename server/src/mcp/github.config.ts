import 'dotenv/config';

export interface GithubMcpConfig {
  /** MCP_ENABLED. The master switch — false keeps the app exactly as it was. */
  enabled: boolean;
  token: string | null;
  owner: string | null;
  repo: string | null;
  /** Optional. Null means the repository's default branch. */
  branch: string | null;
  mcpUrl: string;
}

/** GitHub's hosted MCP server. Point elsewhere to use a local one. */
const DEFAULT_MCP_URL = 'https://api.githubcopilot.com/mcp/';

function readOptional(raw: string | undefined): string | null {
  const text = raw?.trim();
  return text ? text : null;
}

function readBoolean(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() === 'true';
}

/**
 * GitHub settings live here rather than in config/env.ts so the whole MCP
 * feature is self-contained: deleting src/mcp/ removes every trace of it and
 * the rest of the app is unaffected.
 */
export const githubConfig: GithubMcpConfig = {
  enabled: readBoolean(process.env['MCP_ENABLED']),
  token: readOptional(process.env['GITHUB_TOKEN']),
  owner: readOptional(process.env['GITHUB_OWNER']),
  repo: readOptional(process.env['GITHUB_REPO']),
  branch: readOptional(process.env['GITHUB_BRANCH']),
  mcpUrl: readOptional(process.env['GITHUB_MCP_URL']) ?? DEFAULT_MCP_URL,
};

/** Enabled *and* has everything it needs to actually make a call. */
export function isGithubConfigured(config: GithubMcpConfig = githubConfig): boolean {
  return config.enabled && Boolean(config.token && config.owner && config.repo);
}

/** Which required settings are absent — turns "not working" into a real message. */
export function missingGithubSettings(config: GithubMcpConfig = githubConfig): string[] {
  const missing: string[] = [];
  if (!config.token) missing.push('GITHUB_TOKEN');
  if (!config.owner) missing.push('GITHUB_OWNER');
  if (!config.repo) missing.push('GITHUB_REPO');
  return missing;
}
