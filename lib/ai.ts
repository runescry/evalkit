import type { GatewayProviderOptions } from '@ai-sdk/gateway';
import {
  generateText,
  streamText,
} from 'ai';

export type ModelTier = 'fast' | 'strong';

export type TierModelConfig = {
  primary: string;
  /** Gateway fallback chain after primary fails (429, 500, unavailable). */
  fallbacks: string[];
};

export const TIER_MODELS: Record<ModelTier, TierModelConfig> = {
  fast: {
    primary: 'anthropic/claude-haiku-4-5',
    fallbacks: ['google/gemini-2.5-flash', 'anthropic/claude-sonnet-4-6'],
  },
  strong: {
    primary: 'anthropic/claude-sonnet-4-6',
    fallbacks: [],
  },
};

export type EvalkitTelemetry = {
  evalkitTier: ModelTier;
  evalkitStep: string;
};

export type EvalkitCallMeta = EvalkitTelemetry & {
  latencyMs: number;
  modelId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalCost: number | null;
  generationId: string | null;
};

type GatewayProviderMetadata = {
  gateway?: {
    generationId?: string;
    totalCost?: number;
    modelAttempts?: Array<{
      canonicalSlug?: string;
      modelId?: string;
    }>;
  };
};

function gatewayOptions(tier: ModelTier, step: string): { gateway: GatewayProviderOptions } {
  const { fallbacks } = TIER_MODELS[tier];
  return {
    gateway: {
      ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
      tags: [`evalkit.tier:${tier}`, `evalkit.step:${step}`],
    },
  };
}

function telemetryOptions(tier: ModelTier, step: string) {
  return {
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        evalkitTier: tier,
        evalkitStep: step,
      } satisfies EvalkitTelemetry,
    },
  };
}

function extractCallMeta(
  tier: ModelTier,
  step: string,
  latencyMs: number,
  providerMetadata: GatewayProviderMetadata | undefined,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
): EvalkitCallMeta {
  const gateway = providerMetadata?.gateway;
  const modelId =
    gateway?.modelAttempts?.at(-1)?.canonicalSlug ??
    gateway?.modelAttempts?.at(-1)?.modelId ??
    TIER_MODELS[tier].primary;

  return {
    evalkitTier: tier,
    evalkitStep: step,
    latencyMs,
    modelId: modelId ?? null,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    totalCost: gateway?.totalCost ?? null,
    generationId: gateway?.generationId ?? null,
  };
}

export type GenerateWithTierParams = {
  tier: ModelTier;
  step: string;
  prompt: string;
  system?: string;
  maxRetries?: number;
};

export type GenerateWithTierResult = Awaited<ReturnType<typeof generateWithTierInternal>>;

async function generateWithTierInternal(params: GenerateWithTierParams) {
  const { tier, step, prompt, system, maxRetries = 3 } = params;
  const { primary } = TIER_MODELS[tier];
  const started = Date.now();

  const result = await generateText({
    model: primary,
    prompt,
    system,
    maxRetries,
    providerOptions: gatewayOptions(tier, step) as Parameters<typeof generateText>[0]['providerOptions'],
    ...telemetryOptions(tier, step),
  });

  return Object.assign(result, {
    evalkit: extractCallMeta(
      tier,
      step,
      Date.now() - started,
      result.providerMetadata as GatewayProviderMetadata,
      result.usage,
    ),
  });
}

export async function generateWithTier(params: GenerateWithTierParams): Promise<GenerateWithTierResult> {
  return generateWithTierInternal(params);
}

export type StreamWithTierParams = GenerateWithTierParams;

export type StreamWithTierResult = ReturnType<typeof streamWithTier>;

export function streamWithTier(params: StreamWithTierParams) {
  const { tier, step, prompt, system, maxRetries = 3 } = params;
  const { primary } = TIER_MODELS[tier];
  const started = Date.now();

  const result = streamText({
    model: primary,
    prompt,
    system,
    maxRetries,
    providerOptions: gatewayOptions(tier, step) as Parameters<typeof streamText>[0]['providerOptions'],
    ...telemetryOptions(tier, step),
  });

  const evalkit = Promise.resolve(result.providerMetadata).then((metadata) =>
    extractCallMeta(
      tier,
      step,
      Date.now() - started,
      metadata as GatewayProviderMetadata,
      undefined,
    ),
  );

  return Object.assign(result, { evalkit });
}

export type TierHealthResult = {
  tier: ModelTier;
  ok: boolean;
  latencyMs: number;
  modelId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalCost: number | null;
  generationId: string | null;
  error?: string;
};

const HEALTH_PROMPT = 'Reply with exactly: ok';

/** Ping a model tier via Gateway — used by /api/health. */
export async function pingTier(tier: ModelTier): Promise<TierHealthResult> {
  try {
    const result = await generateWithTier({
      tier,
      step: 'health-check',
      prompt: HEALTH_PROMPT,
      maxRetries: 1,
    });

    const text = result.text ?? '';
    return {
      tier,
      ok: text.trim().toLowerCase().includes('ok'),
      latencyMs: result.evalkit.latencyMs,
      modelId: result.evalkit.modelId,
      inputTokens: result.evalkit.inputTokens,
      outputTokens: result.evalkit.outputTokens,
      totalCost: result.evalkit.totalCost,
      generationId: result.evalkit.generationId,
    };
  } catch (error) {
    return {
      tier,
      ok: false,
      latencyMs: 0,
      modelId: null,
      inputTokens: null,
      outputTokens: null,
      totalCost: null,
      generationId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
