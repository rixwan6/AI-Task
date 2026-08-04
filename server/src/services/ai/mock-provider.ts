import { CreateStandupInput } from '../../models/standup.model';
import { SummaryProvider } from './ai-provider';

/**
 * Deterministic, dependency-free summariser.
 *
 * Serves two purposes: it lets the app run with no API key, and it is the
 * fallback when a live AI call fails. It does not attempt to sound generated —
 * it reformats the notes into a consistent structure, which is honest and
 * makes the mock's output obvious in a demo.
 *
 * It deliberately ignores GitHub context: weaving commits into prose is the
 * part that needs a language model, and inventing a template for it here would
 * only blur the line between real and fallback output.
 */
export class MockSummaryProvider implements SummaryProvider {
  readonly source = 'mock' as const;

  async summarize(input: CreateStandupInput): Promise<string> {
    return [
      `Completed: ${asSentence(input.yesterday)}`,
      `Focus today: ${asSentence(input.today)}`,
      input.blockers ? `Blockers: ${asSentence(input.blockers)}` : 'No blockers reported.',
    ].join(' ');
  }
}

/** Collapses whitespace and guarantees terminal punctuation, without doubling it. */
function asSentence(text: string): string {
  const normalised = text.trim().replace(/\s+/g, ' ');
  return /[.!?]$/.test(normalised) ? normalised : `${normalised}.`;
}
