'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCostUsd } from '@/lib/format-cost';
import type { EvalRun, RunMetrics } from '@/lib/types';

type RunCostSummaryProps = {
  metrics: RunMetrics | undefined;
  runStatus: EvalRun['status'];
  isLive?: boolean;
};

export function RunCostSummary({ metrics, runStatus, isLive = false }: RunCostSummaryProps) {
  const terminal =
    runStatus === 'awaiting_approval' || runStatus === 'complete' || runStatus === 'failed';
  const hasSteps = (metrics?.steps.length ?? 0) > 0;
  const pending = isLive || (!terminal && runStatus === 'running');

  if (!pending && !hasSteps) {
    return null;
  }

  const totalCost = metrics?.totalCost ?? 0;
  const totalLatency = metrics?.totalLatencyMs ?? 0;
  const aiCalls = metrics?.aiCallCount ?? 0;
  const costLabel =
    totalCost > 0 ? formatCostUsd(totalCost) : pending ? 'Cost pending…' : formatCostUsd(0);

  return (
    <Card className="eval-card shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title">Cost & latency</CardTitle>
        <CardDescription>
          {costLabel} total · {totalLatency.toLocaleString()} ms
          {aiCalls > 0 ? ` · ${aiCalls} AI call${aiCalls === 1 ? '' : 's'}` : pending ? ' · recording…' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {hasSteps ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {metrics!.steps.map((step) => (
              <li key={step.step} className="flex justify-between gap-4">
                <span className="font-mono text-xs">{step.step}</span>
                <span className="shrink-0 text-right">
                  {step.totalCost > 0 || step.callCount > 0
                    ? formatCostUsd(step.totalCost)
                    : '—'}{' '}
                  · {step.latencyMs.toLocaleString()} ms
                  {step.callCount > 0
                    ? ` · ${step.callCount} call${step.callCount === 1 ? '' : 's'}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the first AI step to finish — costs appear after generate/score calls complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
