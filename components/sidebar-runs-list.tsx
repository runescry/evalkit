'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type RunListItem = {
  id: string;
  status: string;
  createdAt: number;
  description: string;
  url: string;
  caseCount: number;
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed') return 'destructive';
  if (status === 'complete') return 'default';
  if (status === 'awaiting_approval') return 'outline';
  return 'secondary';
}

export function SidebarRunsList() {
  const pathname = usePathname();
  const currentRunId = pathname.startsWith('/runs/') ? pathname.split('/')[2] : null;
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/runs?limit=12');
        if (!res.ok) {
          return;
        }
        const body = (await res.json()) as { runs: RunListItem[] };
        if (!cancelled) {
          setRuns(body.runs);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border">
      <p className="shrink-0 px-3 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {currentRunId ? 'Runs' : 'Recent runs'}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && runs.length === 0 ? (
          <p className="px-2 py-1 text-[11px] text-muted-foreground">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="px-2 py-1 text-[11px] text-muted-foreground">No runs yet</p>
        ) : (
          <ul className="space-y-0.5">
            {runs.map((run) => {
              const active = run.id === currentRunId;
              return (
                <li key={run.id}>
                  <Link
                    href={`/runs/${run.id}`}
                    className={cn(
                      'block rounded-lg px-2.5 py-2 transition-colors',
                      active
                        ? 'bg-primary/12 ring-1 ring-primary/25'
                        : 'hover:bg-muted/80',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {hostFromUrl(run.url)}
                      </span>
                      <Badge
                        variant={statusVariant(run.status)}
                        className="h-4 shrink-0 px-1 text-[9px] capitalize"
                      >
                        {run.status.replaceAll('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                      {run.description}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground/80 truncate">
                      {run.id}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
