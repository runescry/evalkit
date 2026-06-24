import type { GatewayProviderOptions } from '@ai-sdk/gateway';
import {
  gateway,
  generateText,
  streamText,
} from 'ai';
import { recordAiCallWithSpan } from '@/lib/observability';

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

function telemetryOptions(tier: ModelTier, step: string, runId?: string) {
  return {
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        evalkitTier: tier,
        evalkitStep: step,
        ...(runId ? { evalkitRunId: runId } : {}),
      } satisfies EvalkitTelemetry & { evalkitRunId?: string },
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
  const gatewayMeta = providerMetadata?.gateway;
  const modelId =
    gatewayMeta?.modelAttempts?.at(-1)?.canonicalSlug ??
    gatewayMeta?.modelAttempts?.at(-1)?.modelId ??
    TIER_MODELS[tier].primary;

  return {
    evalkitTier: tier,
    evalkitStep: step,
    latencyMs,
    modelId: modelId ?? null,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    totalCost: gatewayMeta?.totalCost ?? null,
    generationId: gatewayMeta?.generationId ?? null,
  };
}

const GENERATION_INFO_RETRIES = 8;
const GENERATION_INFO_DELAY_MS = 400;

/** Gateway often omits totalCost on the response; look it up by generationId. */
export async function lookupGatewayGenerationCost(generationId: string): Promise<number | null> {
  for (let attempt = 0; attempt < GENERATION_INFO_RETRIES; attempt += 1) {
    try {
      const info = await gateway.getGenerationInfo({ id: generationId });
      if (typeof info.totalCost === 'number') {
        return info.totalCost;
      }
    } catch {
      // Generation info may not be indexed yet — retry briefly.
    }
    if (attempt < GENERATION_INFO_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, GENERATION_INFO_DELAY_MS * (attempt + 1)));
    }
  }
  return null;
}

async function resolveCallMeta(
  tier: ModelTier,
  step: string,
  latencyMs: number,
  providerMetadata: GatewayProviderMetadata | undefined,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
): Promise<EvalkitCallMeta> {
  const meta = extractCallMeta(tier, step, latencyMs, providerMetadata, usage);
  if (meta.totalCost != null || !meta.generationId) {
    return meta;
  }

  const totalCost = await lookupGatewayGenerationCost(meta.generationId);
  if (totalCost == null) {
    return meta;
  }

  return { ...meta, totalCost };
}

export type GenerateWithTierParams = {
  tier: ModelTier;
  step: string;
  runId?: string;
  prompt: string;
  system?: string;
  maxRetries?: number;
  output?: Parameters<typeof generateText>[0]['output'];
};

export type GenerateWithTierResult = Awaited<ReturnType<typeof generateWithTierInternal>>;

async function generateWithTierInternal(params: GenerateWithTierParams) {
  const { tier, step, runId, prompt, system, maxRetries = 3, output } = params;
  const { primary } = TIER_MODELS[tier];
  const started = Date.now();

  const result = await generateText({
    model: gateway(primary),
    prompt,
    system,
    maxRetries,
    ...(output ? { output } : {}),
    providerOptions: gatewayOptions(tier, step) as Parameters<typeof generateText>[0]['providerOptions'],
    ...telemetryOptions(tier, step, runId),
  });

  const evalkit = await resolveCallMeta(
    tier,
    step,
    Date.now() - started,
    result.providerMetadata as GatewayProviderMetadata,
    result.usage,
  );

  if (runId) {
    await recordAiCallWithSpan(runId, evalkit);
  }

  return Object.assign(result, { evalkit });
}

export async function generateWithTier(params: GenerateWithTierParams): Promise<GenerateWithTierResult> {
  return generateWithTierInternal(params);
}

export type StreamWithTierParams = GenerateWithTierParams;

export type StreamWithTierResult = ReturnType<typeof streamWithTier>;

export function streamWithTier(params: StreamWithTierParams) {
  const { tier, step, runId, prompt, system, maxRetries = 3 } = params;
  const { primary } = TIER_MODELS[tier];
  const started = Date.now();

  const result = streamText({
    model: gateway(primary),
    prompt,
    system,
    maxRetries,
    providerOptions: gatewayOptions(tier, step) as Parameters<typeof streamText>[0]['providerOptions'],
    ...telemetryOptions(tier, step, runId),
  });

  const evalkit = Promise.all([result.usage, Promise.resolve(result.providerMetadata)]).then(
    async ([usage, metadata]) =>
      resolveCallMeta(
        tier,
        step,
        Date.now() - started,
        metadata as GatewayProviderMetadata,
        usage,
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
