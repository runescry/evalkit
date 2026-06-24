'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ACTIVITY_KIND_STYLES,
  backfillActivity,
  diffRunActivity,
  type ActivityEntry,
  type DiffActivityState,
} from '@/lib/run-activity';
import { cn } from '@/lib/utils';
import type { EvalRun } from '@/lib/types';

type RunActivityStreamProps = {
  run: EvalRun;
  reportMarkdown: string;
  isLive: boolean;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function RunActivityStream({ run, reportMarkdown, isLive }: RunActivityStreamProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const stateRef = useRef<DiffActivityState | null>(null);
  const runIdRef = useRef(run.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (runIdRef.current !== run.id) {
      runIdRef.current = run.id;
      stateRef.current = null;
      setEntries([]);
    }

    if (!stateRef.current) {
      const { entries: initial, state } = backfillActivity(run, reportMarkdown);
      stateRef.current = state;
      setEntries(initial);
      return;
    }

    const next = diffRunActivity(stateRef.current, run, reportMarkdown);
    if (next.length > 0) {
      setEntries((prev) => [...prev, ...next]);
    }
  }, [run, reportMarkdown]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries]);

  return (
    <Card className="eval-card shadow-sm">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-title">
          Live activity
          {isLive ? <Loader2 className="size-4 animate-spin text-primary" aria-hidden /> : null}
        </CardTitle>
        <CardDescription>
          Step-by-step feed as cases, sandbox responses, scores, and report tokens arrive.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto bg-muted/30 font-mono text-[11px] leading-relaxed"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {entries.length === 0 ? (
            <p className="p-4 text-muted-foreground">Waiting for workflow events…</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {entries.map((item) => (
                <li key={item.id} className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatTime(item.at)}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-semibold uppercase',
                        ACTIVITY_KIND_STYLES[item.kind],
                      )}
                    >
                      {item.kind}
                    </span>
                    <span className="min-w-0 text-foreground">{item.message}</span>
                  </div>
                  {item.detail ? (
                    <p className="mt-1 pl-[4.5rem] whitespace-pre-wrap break-words text-muted-foreground">
                      {item.detail}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
