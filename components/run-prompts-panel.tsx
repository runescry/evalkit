'use client';

import { useMemo } from 'react';
import { PromptCallCard } from '@/components/prompt-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildRunPromptCalls, groupPromptCalls } from '@/lib/run-prompts';
import type { EvalRun } from '@/lib/types';

type RunPromptsPanelProps = {
  run: EvalRun;
};

export function RunPromptsPanel({ run }: RunPromptsPanelProps) {
  const groups = useMemo(() => groupPromptCalls(buildRunPromptCalls(run)), [run]);

  if (groups.length === 0) {
    return null;
  }

  const scoreCount = groups.find((group) => group.group === 'Score results')?.calls.length ?? 0;

  return (
    <Card className="eval-card shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title">LLM prompts</CardTitle>
        <CardDescription>
          System and user messages sent to the AI Gateway for this run — reconstructed from prompt
          templates and run data.{' '}
          {scoreCount > 0 ? `${scoreCount} scoring call${scoreCount === 1 ? '' : 's'}.` : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {groups.map((group) => (
          <div key={group.group} className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{group.group}</p>
            <div className="space-y-2">
              {group.calls.map((call, index) => (
                <PromptCallCard
                  key={call.id}
                  label={call.label}
                  step={call.step}
                  tier={call.tier}
                  version={call.version}
                  hash={call.hash}
                  outputFormat={call.outputFormat}
                  messages={call.messages}
                  defaultOpen={group.group !== 'Score results' && index === 0}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
