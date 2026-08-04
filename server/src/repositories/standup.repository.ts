import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from '../config/env';
import { Standup } from '../models/standup.model';

/**
 * JSON-file backed store for standups.
 *
 * The collection is small enough to hold in memory; the file is the durable
 * copy so history survives a restart. This is the only module that touches the
 * filesystem — swapping in a real database means replacing this class alone.
 */
export class StandupRepository {
  private standups: Standup[] = [];
  private loaded = false;

  /** Newest first. Returns a copy so callers cannot mutate the cache. */
  async findAll(): Promise<Standup[]> {
    await this.ensureLoaded();
    return [...this.standups].reverse();
  }

  async create(standup: Standup): Promise<Standup> {
    await this.ensureLoaded();
    this.standups.push(standup);
    await this.persist();
    return standup;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.standups = await readStandupFile(config.dataFilePath);
    this.loaded = true;
  }

  /**
   * Writes are chained rather than fired in parallel: two concurrent POSTs
   * would otherwise race to rewrite the same file and could interleave.
   */
  private writeChain: Promise<void> = Promise.resolve();

  private persist(): Promise<void> {
    this.writeChain = this.writeChain.then(() => this.writeSnapshot());
    return this.writeChain;
  }

  private async writeSnapshot(): Promise<void> {
    await fs.mkdir(path.dirname(config.dataFilePath), { recursive: true });
    await fs.writeFile(config.dataFilePath, JSON.stringify(this.standups, null, 2), 'utf8');
  }
}

async function readStandupFile(filePath: string): Promise<Standup[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Standup[]) : [];
  } catch (error) {
    // No file yet is the normal first-run case. Anything else is a real
    // problem and should surface rather than silently discard stored data.
    if (isFileNotFound(error)) {
      return [];
    }
    throw error;
  }
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

export const standupRepository = new StandupRepository();
