'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvalRun } from '@/lib/types';

type ApprovalCardProps = {
  runId: string;
  status: EvalRun['status'];
  flaggedCount?: number;
  onResolved?: (status: EvalRun['status']) => void;
};

export function ApprovalCard({ runId, status, flaggedCount = 0, onResolved }: ApprovalCardProps) {
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'awaiting_approval') {
    return null;
  }

  async function submit(approved: boolean) {
    setSubmitting(approved ? 'approve' : 'reject');
    setError(null);

    try {
      const response = await fetch(`/api/runs/${runId}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Approval request failed');
      }

      const run = (await response.json()) as EvalRun;
      onResolved?.(run.status);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Approval request failed');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Card className="eval-card shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title">Generate prompt fixes?</CardTitle>
        <CardDescription>
          {flaggedCount > 0 ? (
            <>
              <strong>{flaggedCount}</strong> flagged case{flaggedCount === 1 ? '' : 's'} are listed
              above. Approving runs the fix suggester on those findings — you will see unified diffs
              below once generation finishes. Rejecting marks the run complete with no fixes.
            </>
          ) : (
            <>
              No flagged cases in this run. Approving still runs the fix suggester (it may return
              nothing useful). Rejecting completes the run without fixes.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          disabled={submitting !== null}
          onClick={() => submit(true)}
          className="w-full sm:w-auto"
        >
          {submitting === 'approve' ? 'Generating fixes…' : 'Generate fixes'}
        </Button>
        <Button
          variant="outline"
          disabled={submitting !== null}
          onClick={() => submit(false)}
          className="w-full sm:w-auto"
        >
          {submitting === 'reject' ? 'Rejecting…' : 'Reject'}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
