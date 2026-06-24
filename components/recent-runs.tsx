import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvalRun } from '@/lib/types';

type RecentRunsProps = {
  runs: EvalRun[];
};

function statusLabel(status: EvalRun['status']): string {
  return status.replaceAll('_', ' ');
}

function statusBadgeVariant(
  status: EvalRun['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed') return 'destructive';
  if (status === 'complete') return 'default';
  if (status === 'awaiting_approval') return 'outline';
  return 'secondary';
}

export function RecentRuns({ runs }: RecentRunsProps) {
  if (runs.length === 0) {
    return (
      <Card className="eval-card h-full shadow-sm">
        <CardHeader>
          <CardTitle className="text-title">Recent runs</CardTitle>
          <CardDescription>No eval runs yet — start one on the left.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="eval-card h-full shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title">Recent runs</CardTitle>
        <CardDescription>Latest evals in this workspace.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {runs.map((run) => {
            const flagged = run.results.filter((r) => r.flagged).length;
            return (
              <li key={run.id}>
                <Link
                  href={`/runs/${run.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {run.input.url.replace(/^https?:\/\//, '').split('/')[0]}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {run.input.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {flagged > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        {flagged} flagged
                      </Badge>
                    ) : null}
                    <Badge variant={statusBadgeVariant(run.status)} className="capitalize text-[10px]">
                      {statusLabel(run.status)}
                    </Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
