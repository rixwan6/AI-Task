import 'dotenv/config';

export interface GithubMcpConfig {
  /** MCP_ENABLED. The master switch — false keeps the app exactly as it was. */
  enabled: boolean;
  token: string | null;
  owner: string | null;
  repo: string | null;
  /** Optional. Null means the repository's default branch. */
  branch: string | null;
  /** Any MCP endpoint speaking Streamable HTTP — not GitHub-specific. */
  mcpUrl: string;
}

/**
 * GitHub's *hosted* MCP server. Nothing runs locally: this is a remote
 * endpoint, so the only prerequisite is a token.
 */
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
  // Named MCP_SERVER_URL rather than GITHUB_MCP_URL: it points at an MCP
  // endpoint, which is the swappable part. Only the Streamable HTTP transport
  // is supported, so there is deliberately no MCP_TRANSPORT setting — it would
  // accept exactly one value and imply flexibility that does not exist.
  mcpUrl: readOptional(process.env['MCP_SERVER_URL']) ?? DEFAULT_MCP_URL,
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
