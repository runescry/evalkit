'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ApprovalCard } from '@/components/approval-card';
import { FlaggedFindings } from '@/components/flagged-findings';
import { FixSuggestions } from '@/components/fix-suggestions';
import { PageHeader } from '@/components/page-header';
import { ReportMarkdown } from '@/components/report-markdown';
import { RunCostSummary } from '@/components/run-cost-summary';
import { RunActivityStream } from '@/components/run-activity-stream';
import { RunProgress } from '@/components/run-progress';
import { LlmTracePanel } from '@/components/llm-trace-panel';
import { RunReportSkeleton } from '@/components/run-report-skeleton';
import { TierComparison } from '@/components/tier-comparison';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribeRunStream } from '@/lib/sse';
import { cn } from '@/lib/utils';
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
    const terminal =
      run.status === 'awaiting_approval' || run.status === 'complete' || run.status === 'failed';

    let metricsPollId: number | undefined;

    async function refreshMetrics(): Promise<RunMetrics | undefined> {
      const nextMetrics = await fetchRunMetrics(run.id);
      if (nextMetrics) {
        setMetrics(nextMetrics);
      }
      const fresh = await fetchRun(run.id).catch(() => null);
      if (fresh?.metrics) {
        setMetrics(fresh.metrics);
      }
      if (fresh) {
        setRun(fresh);
      }
      return fresh?.metrics ?? nextMetrics;
    }

    function shouldKeepMetricsPoll(next: RunMetrics | undefined): boolean {
      if (!next) {
        return !terminal;
      }
      if (!terminal) {
        return next.aiCallCount === 0;
      }
      return next.totalCost === 0 && next.aiCallCount > 0;
    }

    function startMetricsPoll() {
      void refreshMetrics().then((next) => {
        if (!shouldKeepMetricsPoll(next)) {
          return;
        }
        metricsPollId = window.setInterval(() => {
          void refreshMetrics().then((polled) => {
            if (!shouldKeepMetricsPoll(polled)) {
              if (metricsPollId != null) {
                window.clearInterval(metricsPollId);
                metricsPollId = undefined;
              }
            }
          });
        }, 2000);
      });
    }

    if (terminal) {
      startMetricsPoll();
      return () => {
        if (metricsPollId != null) {
          window.clearInterval(metricsPollId);
        }
      };
    }

    const poll = window.setInterval(() => {
      void fetchRun(run.id)
        .then((fresh) => {
          setRun(fresh);
          if (fresh.metrics) {
            setMetrics(fresh.metrics);
          }
          if (fresh.report?.markdown) {
            setMarkdown(fresh.report.markdown);
            if (fresh.report.summary) {
              setSummary(fresh.report.summary);
            }
          }
        })
        .catch(() => {
          // SSE remains primary; polling is best-effort for step counts.
        });
    }, 1500);

    startMetricsPoll();

    const unsubscribe = subscribeRunStream(run.id, {
      onRun: (data) => {
        setRun((current) => ({
          ...current,
          status: data.status as EvalRun['status'],
        }));
        void fetchRun(run.id)
          .then(setRun)
          .catch(() => undefined);
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

    return () => {
      window.clearInterval(poll);
      if (metricsPollId != null) {
        window.clearInterval(metricsPollId);
      }
      unsubscribe();
    };
  }, [run.id, run.status, streamDone]);

  async function handleApprovalResolved(updated: EvalRun) {
    setRun(updated);
    setMetrics(updated.metrics);
    setMarkdown(updated.report?.markdown ?? markdown);
    setSummary(updated.report?.summary);

    try {
      const nextMetrics = await fetchRunMetrics(run.id);
      if (nextMetrics) {
        setMetrics(nextMetrics);
      }
    } catch {
      // Best-effort metrics refresh after approval.
    }
  }

  const scoredCount = run.results.filter((result) => result.total !== null).length;
  const flaggedCount = run.results.filter((result) => result.flagged).length;
  const isRunning = run.status === 'pending' || run.status === 'running';
  const showSkeleton = !markdown && !isRunning && !streamDone;
  const streamingReport = Boolean(markdown) && isRunning;
  const totalCases = run.testCases.length;
  const totalScore = run.results.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const maxScore = scoredCount * 20;

  return (
    <>
      <PageHeader
        title="Eval report"
        description={run.input.description}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              <ArrowLeft className="size-4" aria-hidden />
              New eval
            </Link>
            <Badge variant={statusVariant(run.status)} className="capitalize">
              {run.status.replaceAll('_', ' ')}
            </Badge>
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <p className="font-mono text-[11px] text-muted-foreground">{run.id}</p>

        <div className="flex flex-wrap gap-2">
          <span className="stat-pill">{totalCases} cases</span>
          <span className="stat-pill">
            {scoredCount}/{run.results.length || totalCases} scored
          </span>
          <span className={flaggedCount > 0 ? 'stat-pill border-destructive/30 text-destructive' : 'stat-pill'}>
            {flaggedCount} flagged
          </span>
          {maxScore > 0 ? (
            <span className="stat-pill">
              {totalScore}/{maxScore} ({Math.round((totalScore / maxScore) * 100)}%)
            </span>
          ) : null}
          {run.input.generationMode === 'adversarial' ? (
            <span className="stat-pill border-amber-500/30">Adversarial cases</span>
          ) : null}
          {run.input.scoringMode === 'dual' ? (
            <span className="stat-pill">Dual scoring</span>
          ) : null}
        </div>

        <RunCostSummary metrics={metrics} runStatus={run.status} isLive={isRunning} />

        <RunProgress run={run} streamingReport={streamingReport} />

        <RunActivityStream run={run} reportMarkdown={markdown} isLive={isRunning} />

        {showSkeleton ? (
          <RunReportSkeleton />
        ) : markdown || isRunning ? (
          <Card className="eval-card shadow-sm">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-title">
                Report
                {streamingReport ? (
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                ) : null}
              </CardTitle>
              {summary ? <CardDescription>{summary}</CardDescription> : null}
            </CardHeader>
            <CardContent className="pt-5">
              {markdown ? (
                <ReportMarkdown markdown={markdown} />
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Waiting for first report tokens…
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <LlmTracePanel run={run} />

        {run.error ? (
          <Card className="eval-card border-destructive/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive">Run failed</CardTitle>
              <CardDescription>{run.error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <FlaggedFindings testCases={run.testCases} results={run.results} />

        {run.input.scoringMode === 'dual' ? <TierComparison results={run.results} /> : null}

        <ApprovalCard
          runId={run.id}
          status={run.status}
          flaggedCount={flaggedCount}
          onResolved={handleApprovalResolved}
        />

        {run.suggestedFixes && run.suggestedFixes.length > 0 ? (
          <FixSuggestions fixes={run.suggestedFixes} />
        ) : run.status === 'complete' && run.approvedAt != null ? (
          <Card className="eval-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-title">Suggested prompt fixes</CardTitle>
              <CardDescription>
                Fix generation finished but the model returned no diffs for this run.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </>
  );
}
