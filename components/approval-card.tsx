'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseApprovalResponse, pollRunAfterApproval } from '@/lib/poll-run-after-approval';
import type { EvalRun } from '@/lib/types';

type ApprovalCardProps = {
  runId: string;
  status: EvalRun['status'];
  flaggedCount?: number;
  onResolved?: (run: EvalRun) => void;
};

export function ApprovalCard({ runId, status, flaggedCount = 0, onResolved }: ApprovalCardProps) {
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [generatingFixes, setGeneratingFixes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'awaiting_approval' && !generatingFixes) {
    return null;
  }

  async function submit(approved: boolean) {
    setSubmitting(approved ? 'approve' : 'reject');
    setError(null);
    if (approved) {
      setGeneratingFixes(true);
    }

    try {
      const response = await fetch(`/api/runs/${runId}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved }),
      });

      const parsed = await parseApprovalResponse(response);
      if (parsed.error) {
        throw new Error(parsed.error);
      }

      const resolvedRun = parsed.resumed
        ? await pollRunAfterApproval(runId)
        : parsed.run ?? (await pollRunAfterApproval(runId));

      onResolved?.(resolvedRun);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Approval request failed');
    } finally {
      setSubmitting(null);
      setGeneratingFixes(false);
    }
  }

  if (generatingFixes || submitting === 'approve') {
    return (
      <Card className="eval-card shadow-sm">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-title">Generating prompt fixes</CardTitle>
          <CardDescription>
            Running the fix suggester on flagged findings — this usually takes 15–30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please keep this tab open…</p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    );
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
          Generate fixes
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
