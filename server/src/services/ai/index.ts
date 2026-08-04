import { config } from '../../config/env';
import { CreateStandupInput, SummarySource } from '../../models/standup.model';
import { SummaryContext, SummaryProvider, SummaryResult } from './ai-provider';
import { MockSummaryProvider } from './mock-provider';
import { OpenAiCompatibleProvider } from './openai-compatible-provider';

export { SummaryContext, SummaryResult } from './ai-provider';

// Typed as the interface, not the concrete class: the mock ignores context and
// so declares a narrower signature, which is legal for an implementation but
// means callers must go through the interface to pass one.
const mockProvider: SummaryProvider = new MockSummaryProvider();

/**
 * The live provider when a key is configured, the mock otherwise. Chosen once
 * at startup.
 *
 * Swapping vendor (Groq → OpenRouter, Together, a local Ollama, …) is a change
 * to AI_BASE_URL and AI_MODEL, not to this file. Swapping to a provider that
 * is *not* OpenAI-compatible means writing one new class that implements
 * SummaryProvider and changing the line below.
 */
const primaryProvider: SummaryProvider = config.ai.apiKey
  ? new OpenAiCompatibleProvider({
      apiKey: config.ai.apiKey,
      baseUrl: config.ai.baseUrl,
      model: config.ai.model,
    })
  : mockProvider;

/** Which provider requests will try first. Reported by GET /api/health. */
export const activeProviderSource: SummarySource = primaryProvider.source;

/**
 * Summarises a standup, degrading to the mock provider when the AI call fails
 * for any reason — rate limit, timeout, network, refusal.
 *
 * The user's standup is the valuable thing here; a summary is an enhancement.
 * So an AI outage must never turn into a failed submission.
 */
export async function summarizeStandup(
  input: CreateStandupInput,
  context?: SummaryContext,
): Promise<SummaryResult> {
  try {
    const summary = await primaryProvider.summarize(input, context);
    return { summary, source: primaryProvider.source };
  } catch (error) {
    // The mock has no external dependencies — if it throws, that is a genuine
    // bug and should surface rather than be swallowed by its own fallback.
    if (primaryProvider === mockProvider) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[ai] Falling back to mock summary. Reason: ${reason}`);

    const summary = await mockProvider.summarize(input, context);
    return { summary, source: mockProvider.source };
  }
}
