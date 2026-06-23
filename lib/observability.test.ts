import { describe, expect, it } from 'vitest';
import type { EvalkitCallMeta } from '@/lib/ai';
import { formatCostUsd } from './format-cost';
import {
  emptyRunMetrics,
  hashDescription,
  mergeAiCallIntoMetrics,
  mergeWorkflowStepLatency,
  urlDomainOnly,
} from './observability';

describe('lib/observability', () => {
  it('urlDomainOnly returns hostname only', () => {
    expect(urlDomainOnly('https://api.example.com/chat?token=secret')).toBe('api.example.com');
  });

  it('urlDomainOnly handles invalid URLs', () => {
    expect(urlDomainOnly('not-a-url')).toBe('invalid-url');
  });

  it('hashDescription returns stable short sha256 prefix', () => {
    const first = hashDescription('Fintech support bot');
    const second = hashDescription('Fintech support bot');
    expect(first).toHaveLength(12);
    expect(first).toBe(second);
    expect(first).not.toBe(hashDescription('Other description'));
  });

  it('mergeAiCallIntoMetrics aggregates by step', () => {
    const meta: EvalkitCallMeta = {
      evalkitTier: 'fast',
      evalkitStep: 'generate-test-cases',
      latencyMs: 120,
      modelId: 'anthropic/claude-haiku-4-5',
      inputTokens: 100,
      outputTokens: 50,
      totalCost: 0.002,
      generationId: 'gen-1',
    };

    const first = mergeAiCallIntoMetrics(undefined, meta);
    expect(first.steps).toHaveLength(1);
    expect(first.totalCost).toBe(0.002);
    expect(first.aiCallCount).toBe(1);

    const second = mergeAiCallIntoMetrics(first, {
      ...meta,
      latencyMs: 80,
      inputTokens: 20,
      outputTokens: 10,
      totalCost: 0.001,
    });

    expect(second.steps[0]).toMatchObject({
      step: 'generate-test-cases',
      latencyMs: 200,
      inputTokens: 120,
      outputTokens: 60,
      totalCost: 0.003,
      callCount: 2,
    });
    expect(second.totalCost).toBe(0.003);
    expect(second.aiCallCount).toBe(2);
  });

  it('mergeWorkflowStepLatency records non-AI step latency', () => {
    const metrics = mergeWorkflowStepLatency(undefined, 'run-sandbox', 1500);
    expect(metrics.steps[0]).toMatchObject({
      step: 'run-sandbox',
      latencyMs: 1500,
      callCount: 0,
      totalCost: 0,
    });
    expect(metrics.totalLatencyMs).toBe(1500);
  });

  it('formatCostUsd renders four decimal places', () => {
    expect(formatCostUsd(0.0042)).toBe('$0.0042');
  });

  it('emptyRunMetrics returns zeroed metrics', () => {
    expect(emptyRunMetrics(123)).toEqual({
      steps: [],
      totalCost: 0,
      totalLatencyMs: 0,
      aiCallCount: 0,
      updatedAt: 123,
    });
  });
});
