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

export function RecentRuns({ runs }: RecentRunsProps) {
  if (runs.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>No eval runs yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recent runs</CardTitle>
        <CardDescription>Latest eval runs from this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/runs/${run.id}`} className="font-medium hover:underline">
                  {run.id}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{run.input.description}</p>
              </div>
              <Badge variant="secondary" className="w-fit capitalize">
                {statusLabel(run.status)}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
