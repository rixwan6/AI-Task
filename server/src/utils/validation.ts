import { CreateStandupInput } from '../models/standup.model';
import { AppError } from './app-error';

const MAX_FIELD_LENGTH = 2000;

/**
 * Turns an untrusted request body into a `CreateStandupInput`, or throws a 400
 * listing every problem at once — clients get all their mistakes in one round
 * trip rather than one per attempt.
 */
export function parseCreateStandupInput(body: unknown): CreateStandupInput {
  const source = isRecord(body) ? body : {};
  const errors: string[] = [];

  const yesterday = readRequiredText(source['yesterday'], 'yesterday', errors);
  const today = readRequiredText(source['today'], 'today', errors);
  const blockers = readOptionalText(source['blockers'], 'blockers', errors);

  if (errors.length > 0) {
    throw AppError.badRequest('Validation failed.', errors);
  }

  return { yesterday, today, blockers };
}

function readRequiredText(value: unknown, field: string, errors: string[]): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`"${field}" is required and must be a non-empty string.`);
    return '';
  }

  const text = value.trim();
  if (text.length > MAX_FIELD_LENGTH) {
    errors.push(`"${field}" must be ${MAX_FIELD_LENGTH} characters or fewer.`);
    return '';
  }

  return text;
}

function readOptionalText(value: unknown, field: string, errors: string[]): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    errors.push(`"${field}" must be a string when provided.`);
    return null;
  }

  const text = value.trim();
  if (text.length === 0) {
    return null;
  }

  if (text.length > MAX_FIELD_LENGTH) {
    errors.push(`"${field}" must be ${MAX_FIELD_LENGTH} characters or fewer.`);
    return null;
  }

  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
