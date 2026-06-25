import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateWithTier, TIER_MODELS, pingTier } from './ai';

const { generateTextMock, gatewayModelMock, getGenerationInfoMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  gatewayModelMock: vi.fn((model: string) => `gateway:${model}`),
  getGenerationInfoMock: vi.fn(),
}));

const observabilityMocks = vi.hoisted(() => ({
  recordAiCallWithSpan: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
  recordAiCallWithSpan: observabilityMocks.recordAiCallWithSpan,
}));

vi.mock('ai', () => ({
  generateText: generateTextMock,
  streamText: vi.fn(),
  gateway: Object.assign(gatewayModelMock, {
    getGenerationInfo: getGenerationInfoMock,
  }),
}));

describe('lib/ai', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    getGenerationInfoMock.mockReset();
    observabilityMocks.recordAiCallWithSpan.mockResolvedValue(undefined);
  });

  it('routes fast tier to haiku with gemini and sonnet fallbacks', async () => {
    generateTextMock.mockResolvedValue({
      text: 'ok',
      usage: { inputTokens: 5, outputTokens: 2 },
      providerMetadata: { gateway: { generationId: 'gen-1', totalCost: 0.0001 } },
    });

    const result = await generateWithTier({
      tier: 'fast',
      step: 'generate-test-cases',
      prompt: 'hello',
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: `gateway:${TIER_MODELS.fast.primary}`,
        prompt: 'hello',
        providerOptions: {
          gateway: {
            models: TIER_MODELS.fast.fallbacks,
            tags: ['evalkit.tier:fast', 'evalkit.step:generate-test-cases'],
          },
        },
        experimental_telemetry: {
          isEnabled: true,
          metadata: { evalkitTier: 'fast', evalkitStep: 'generate-test-cases' },
        },
      }),
    );
    expect(result.evalkit.evalkitTier).toBe('fast');
    expect(result.evalkit.evalkitStep).toBe('generate-test-cases');
  });

  it('routes strong tier to sonnet without fallbacks', async () => {
    generateTextMock.mockResolvedValue({
      text: 'ok',
      usage: { inputTokens: 10, outputTokens: 4 },
      providerMetadata: {},
    });

    await generateWithTier({
      tier: 'strong',
      step: 'score-results',
      prompt: 'score',
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: `gateway:${TIER_MODELS.strong.primary}`,
        providerOptions: {
          gateway: {
            tags: ['evalkit.tier:strong', 'evalkit.step:score-results'],
          },
        },
      }),
    );
  });

  it('routes openai tier to gpt-4.1 via gateway', async () => {
    generateTextMock.mockResolvedValue({
      text: 'ok',
      usage: { inputTokens: 10, outputTokens: 4 },
      providerMetadata: { gateway: { generationId: 'gen-oai', totalCost: 0.0002 } },
    });

    const result = await generateWithTier({
      tier: 'openai',
      step: 'score-results-openai',
      prompt: 'score',
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: `gateway:${TIER_MODELS.openai.primary}`,
        providerOptions: {
          gateway: {
            tags: ['evalkit.tier:openai', 'evalkit.step:score-results-openai'],
          },
        },
      }),
    );
    expect(result.evalkit.evalkitTier).toBe('openai');
  });

  it('escalates fast tier fallbacks through gateway.models including sonnet', () => {
    expect(TIER_MODELS.fast.fallbacks).toContain('google/gemini-2.5-flash');
    expect(TIER_MODELS.fast.fallbacks).toContain('anthropic/claude-sonnet-4-6');
  });

  it('includes runId in telemetry metadata when provided', async () => {
    generateTextMock.mockResolvedValue({
      text: 'ok',
      usage: { inputTokens: 5, outputTokens: 2 },
      providerMetadata: {},
    });

    await generateWithTier({
      tier: 'fast',
      step: 'generate-test-cases',
      runId: 'run_telemetry',
      prompt: 'hello',
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        experimental_telemetry: {
          isEnabled: true,
          metadata: {
            evalkitTier: 'fast',
            evalkitStep: 'generate-test-cases',
            evalkitRunId: 'run_telemetry',
          },
        },
      }),
    );
  });

  it('looks up totalCost via gateway.getGenerationInfo when missing from response', async () => {
    generateTextMock.mockResolvedValue({
      text: 'ok',
      usage: { inputTokens: 5, outputTokens: 2 },
      providerMetadata: { gateway: { generationId: 'gen-lookup' } },
    });
    getGenerationInfoMock.mockResolvedValue({ totalCost: 0.00042 });

    const result = await generateWithTier({
      tier: 'fast',
      step: 'generate-test-cases',
      prompt: 'hello',
    });

    expect(getGenerationInfoMock).toHaveBeenCalledWith({ id: 'gen-lookup' });
    expect(result.evalkit.totalCost).toBe(0.00042);
  });

  it('pingTier returns ok when model responds with ok', async () => {
    generateTextMock.mockResolvedValue({
      text: 'ok',
      usage: { inputTokens: 1, outputTokens: 1 },
      providerMetadata: { gateway: { generationId: 'gen-2' } },
    });
    getGenerationInfoMock.mockResolvedValue({ totalCost: 0.0001 });

    const health = await pingTier('fast');
    expect(health.ok).toBe(true);
    expect(health.tier).toBe('fast');
    expect(health.generationId).toBe('gen-2');
  });

  it('pingTier treats missing text as unhealthy', async () => {
    generateTextMock.mockResolvedValue({
      text: undefined,
      usage: { inputTokens: 1, outputTokens: 0 },
      providerMetadata: {},
    });

    const health = await pingTier('fast');
    expect(health.ok).toBe(false);
    expect(health.error).toBeUndefined();
  });

  it('pingTier surfaces errors without throwing', async () => {
    generateTextMock.mockRejectedValue(new Error('Gateway rate limit'));

    const health = await pingTier('strong');
    expect(health.ok).toBe(false);
    expect(health.error).toContain('rate limit');
  });
});
