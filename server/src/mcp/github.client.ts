import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { GithubMcpConfig, githubConfig, isGithubConfigured } from './github.config';
import { parseToolResult } from './github.tools';

const CONNECT_TIMEOUT_MS = 10_000;
const CALL_TIMEOUT_MS = 15_000;

/**
 * Owns the MCP connection to GitHub's server.
 *
 * Connects lazily on first use rather than at startup, so a missing or broken
 * GitHub configuration can never delay or prevent the API from booting — the
 * standup feature stays available regardless.
 *
 * The connection is a singleton: the MCP `initialize` handshake is per-session,
 * so opening one per HTTP request would add a round trip to every call.
 */
export class GithubMcpClient {
  private client: Client | null = null;
  /** In-flight connect, so concurrent requests share one handshake. */
  private connecting: Promise<Client> | null = null;
  private toolNames: string[] = [];

  constructor(private readonly config: GithubMcpConfig = githubConfig) {}

  /** Tool names advertised by the server. Empty until first connect. */
  get availableTools(): string[] {
    return [...this.toolNames];
  }

  async listToolNames(): Promise<string[]> {
    await this.ensureConnected();
    return this.availableTools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const client = await this.ensureConnected();

    try {
      const result = await client.callTool({ name, arguments: args }, undefined, {
        timeout: CALL_TIMEOUT_MS,
      });
      return parseToolResult(result);
    } catch (error) {
      // A failed call may mean a dead session. Drop it so the next request
      // reconnects instead of reusing a broken one.
      this.reset();
      throw new Error(`MCP tool "${name}" failed: ${describe(error)}`);
    }
  }

  async close(): Promise<void> {
    const client = this.client;
    this.reset();
    if (client) {
      await client.close().catch(() => undefined);
    }
  }

  private ensureConnected(): Promise<Client> {
    if (this.client) {
      return Promise.resolve(this.client);
    }
    // Reuse an in-flight connect rather than starting a second handshake.
    this.connecting ??= this.connect().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private async connect(): Promise<Client> {
    if (!isGithubConfigured(this.config)) {
      throw new Error('GitHub MCP is not configured.');
    }

    const transport = new StreamableHTTPClientTransport(new URL(this.config.mcpUrl), {
      // The PAT never leaves the server; it is attached here as a bearer token.
      requestInit: {
        headers: { Authorization: `Bearer ${this.config.token}` },
      },
    });

    const client = new Client({ name: 'smart-standup-bot', version: '1.0.0' });

    try {
      await withTimeout(
        client.connect(transport),
        CONNECT_TIMEOUT_MS,
        'Timed out connecting to the GitHub MCP server.',
      );

      // Tool discovery is the part of MCP a REST client has no equivalent for:
      // the server tells us what it can do, and the schemas come with it.
      const { tools } = await client.listTools(undefined, { timeout: CALL_TIMEOUT_MS });
      this.toolNames = tools.map((tool) => tool.name);
      this.client = client;

      return client;
    } catch (error) {
      await client.close().catch(() => undefined);
      this.reset();
      throw new Error(`GitHub MCP connection failed: ${describe(error)}`);
    }
  }

  private reset(): void {
    this.client = null;
    this.toolNames = [];
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** Never include the token in an error message. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const githubMcpClient = new GithubMcpClient();
