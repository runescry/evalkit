'use client';

import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPipelineProgress, isStaleRun } from '@/lib/run-pipeline';
import { cn } from '@/lib/utils';
import type { EvalRun } from '@/lib/types';

type RunProgressProps = {
  run: EvalRun;
  streamingReport?: boolean;
};

export function RunProgress({ run, streamingReport }: RunProgressProps) {
  const { steps, activeStepId, percent, isActive } = getPipelineProgress(run);
  const stale = isStaleRun(run);

  if (!isActive && run.status !== 'failed') {
    return null;
  }

  return (
    <Card className="eval-card border-primary/20 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-title">
              {isActive ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
              ) : null}
              {run.status === 'failed' ? 'Run failed' : 'Eval in progress'}
            </CardTitle>
            <CardDescription className="mt-1">
              {run.status === 'failed'
                ? (run.error ?? 'A workflow step failed.')
                : stale
                  ? 'No progress for several minutes — the workflow may have been interrupted when the dev server restarted.'
                  : 'Pipeline steps update live as KV is written between workflow checkpoints.'}
            </CardDescription>
          </div>
          {isActive ? (
            <span className="stat-pill shrink-0 tabular-nums">{percent}%</span>
          ) : null}
        </div>
        {isActive ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {steps.map((step) => {
          const active = step.id === activeStepId;
          const done = step.state === 'complete';
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                active && 'border-primary/40 bg-primary/5',
                done && !active && 'border-border/60 bg-muted/30',
                !active && !done && 'border-transparent opacity-50',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                  active && 'text-primary',
                  done && 'bg-primary/15 text-primary',
                  !active && !done && 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                {active ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : done ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('font-medium', active && 'text-foreground')}>{step.label}</p>
                <p className="text-[12px] text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          );
        })}
        {streamingReport ? (
          <p className="pt-1 text-[12px] text-primary">Report tokens streaming below…</p>
        ) : null}
        {stale ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[12px]">
            <p className="font-medium text-foreground">This run looks stuck</p>
            <p className="mt-1 text-muted-foreground">
              Adversarial generation with 15 cases can take 1–2 minutes, but zero cases after 3+
              minutes usually means the workflow died. Start a fresh eval — avoid restarting{' '}
              <code className="text-[11px]">npm run dev</code> mid-run.
            </p>
            <Link href="/" className={cn(buttonVariants({ size: 'sm' }), 'mt-3 inline-flex')}>
              Start new eval
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
