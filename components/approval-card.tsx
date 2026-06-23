'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvalRun } from '@/lib/types';

type ApprovalCardProps = {
  runId: string;
  status: EvalRun['status'];
  onResolved?: (status: EvalRun['status']) => void;
};

export function ApprovalCard({ runId, status, onResolved }: ApprovalCardProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>Approve prompt fixes?</CardTitle>
        <CardDescription>
          Approving will generate suggested prompt changes from flagged findings. Rejecting
          completes the run without fixes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          disabled={submitting !== null}
          onClick={() => submit(true)}
          className="w-full sm:w-auto"
        >
          {submitting === 'approve' ? 'Approving…' : 'Approve fixes'}
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
