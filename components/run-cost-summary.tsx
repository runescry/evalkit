'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCostUsd } from '@/lib/format-cost';
import type { RunMetrics } from '@/lib/types';

type RunCostSummaryProps = {
  metrics: RunMetrics | undefined;
};

export function RunCostSummary({ metrics }: RunCostSummaryProps) {
  if (!metrics || metrics.steps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost & latency</CardTitle>
        <CardDescription>
          {formatCostUsd(metrics.totalCost)} total · {metrics.totalLatencyMs.toLocaleString()} ms ·{' '}
          {metrics.aiCallCount} AI call{metrics.aiCallCount === 1 ? '' : 's'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {metrics.steps.map((step) => (
            <li key={step.step} className="flex justify-between gap-4">
              <span className="font-mono text-xs">{step.step}</span>
              <span className="shrink-0 text-right">
                {formatCostUsd(step.totalCost)} · {step.latencyMs.toLocaleString()} ms
                {step.callCount > 0 ? ` · ${step.callCount} call${step.callCount === 1 ? '' : 's'}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
