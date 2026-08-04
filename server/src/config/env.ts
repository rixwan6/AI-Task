import 'dotenv/config';
import path from 'node:path';

export interface AiConfig {
  /** Null when unset — the signal that the mock provider should be used. */
  apiKey: string | null;
  /** Any OpenAI-compatible endpoint. Change this to change vendor. */
  baseUrl: string;
  model: string;
}

export interface AppConfig {
  port: number;
  corsOrigin: string;
  ai: AiConfig;
  dataFilePath: string;
}

/** Groq: ongoing free tier, no card, and the fastest inference available. */
const DEFAULT_AI_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_AI_MODEL = 'llama-3.3-70b-versatile';

function readPort(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readOptional(raw: string | undefined): string | null {
  const text = raw?.trim();
  return text ? text : null;
}

/**
 * Resolved once at import time. Nothing here throws: every value has a working
 * default, so `npm run dev` succeeds on a clean checkout with no .env file.
 */
export const config: AppConfig = {
  port: readPort(process.env['PORT'], 3000),
  corsOrigin: readOptional(process.env['CORS_ORIGIN']) ?? 'http://localhost:4200',
  ai: {
    apiKey: readOptional(process.env['AI_API_KEY']),
    baseUrl: readOptional(process.env['AI_BASE_URL']) ?? DEFAULT_AI_BASE_URL,
    model: readOptional(process.env['AI_MODEL']) ?? DEFAULT_AI_MODEL,
  },
  // Resolved relative to this file so the path is identical under tsx (src/)
  // and under node (dist/). Both land on <server>/data/standups.json.
  dataFilePath: path.resolve(__dirname, '../../data/standups.json'),
};
