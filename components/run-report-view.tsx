'use client';

import { useEffect, useState } from 'react';
import { ApprovalCard } from '@/components/approval-card';
import { FixSuggestions } from '@/components/fix-suggestions';
import { RunCostSummary } from '@/components/run-cost-summary';
import { RunReportSkeleton } from '@/components/run-report-skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribeRunStream } from '@/lib/sse';
import type { EvalRun, RunMetrics } from '@/lib/types';

type RunReportViewProps = {
  initialRun: EvalRun;
};

function statusVariant(status: EvalRun['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed') {
    return 'destructive';
  }
  if (status === 'complete' || status === 'awaiting_approval') {
    return 'default';
  }
  return 'secondary';
}

async function fetchRun(runId: string): Promise<EvalRun> {
  const response = await fetch(`/api/runs/${runId}`);
  if (!response.ok) {
    throw new Error('Failed to refresh run');
  }
  return response.json() as Promise<EvalRun>;
}

async function fetchRunMetrics(runId: string): Promise<RunMetrics | undefined> {
  const response = await fetch(`/api/runs/${runId}/metrics`);
  if (!response.ok) {
    return undefined;
  }
  const body = (await response.json()) as { metrics: RunMetrics };
  return body.metrics;
}

export function RunReportView({ initialRun }: RunReportViewProps) {
  const [run, setRun] = useState(initialRun);
  const [metrics, setMetrics] = useState<RunMetrics | undefined>(initialRun.metrics);
  const [markdown, setMarkdown] = useState(initialRun.report?.markdown ?? '');
  const [summary, setSummary] = useState(initialRun.report?.summary);
  const [streamDone, setStreamDone] = useState(
    initialRun.status === 'awaiting_approval' ||
      initialRun.status === 'complete' ||
      initialRun.status === 'failed',
  );

  useEffect(() => {
    if (streamDone) {
      void fetchRunMetrics(run.id).then((nextMetrics) => {
        if (nextMetrics) {
          setMetrics(nextMetrics);
        }
      });
      return;
    }

    return subscribeRunStream(run.id, {
      onRun: (data) => {
        setRun((current) => ({ ...current, status: data.status as EvalRun['status'] }));
      },
      onReport: (data) => {
        setMarkdown(data.markdown);
        if (data.summary) {
          setSummary(data.summary);
        }
      },
      onDone: (data) => {
        setRun((current) => ({ ...current, status: data.status as EvalRun['status'] }));
        setStreamDone(true);
      },
      onError: () => {
        setStreamDone(true);
      },
    });
  }, [run.id, streamDone]);

  async function handleApprovalResolved() {
    try {
      const updated = await fetchRun(run.id);
      setRun(updated);
      setMetrics(updated.metrics);
      setMarkdown(updated.report?.markdown ?? markdown);
      setSummary(updated.report?.summary);
      const nextMetrics = await fetchRunMetrics(run.id);
      if (nextMetrics) {
        setMetrics(nextMetrics);
      }
    } catch {
      // Keep current UI if refresh fails; approval API already returned status.
    }
  }

  const scoredCount = run.results.filter((result) => result.total !== null).length;
  const flaggedCount = run.results.filter((result) => result.flagged).length;
  const showSkeleton = !markdown && !streamDone;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Eval run</h1>
          <p className="text-sm text-muted-foreground">{run.id}</p>
        </div>
        <Badge variant={statusVariant(run.status)} className="w-fit capitalize">
          {run.status.replace('_', ' ')}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
          <CardDescription>
            {run.testCases.length} cases · {scoredCount}/{run.results.length || run.testCases.length}{' '}
            scored · {flaggedCount} flagged
          </CardDescription>
        </CardHeader>
      </Card>

      <RunCostSummary metrics={metrics} />

      {showSkeleton ? (
        <RunReportSkeleton />
      ) : (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Report</CardTitle>
            {summary ? <CardDescription>{summary}</CardDescription> : null}
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {markdown || 'Waiting for report…'}
            </article>
          </CardContent>
        </Card>
      )}

      {run.error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Run failed</CardTitle>
            <CardDescription>{run.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <ApprovalCard runId={run.id} status={run.status} onResolved={handleApprovalResolved} />

      {run.suggestedFixes ? <FixSuggestions fixes={run.suggestedFixes} /> : null}
    </div>
  );
}
