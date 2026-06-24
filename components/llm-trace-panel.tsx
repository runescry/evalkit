'use client';

import { useMemo } from 'react';
import { PromptCallCard } from '@/components/prompt-display';
import { formatCostUsd } from '@/lib/format-cost';
import { groupLlmTraceEntries, resolveRunLlmTrace } from '@/lib/llm-trace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvalRun } from '@/lib/types';

type LlmTracePanelProps = {
  run: EvalRun;
};

export function LlmTracePanel({ run }: LlmTracePanelProps) {
  const groups = useMemo(() => groupLlmTraceEntries(resolveRunLlmTrace(run)), [run]);

  if (groups.length === 0) {
    return null;
  }

  const stored = (run.llmTrace?.length ?? 0) > 0;

  return (
    <Card className="eval-card shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title">LLM trace</CardTitle>
        <CardDescription>
          Every EvalKit Gateway call — system and user prompts plus model responses.
          {stored ? ' Captured at call time.' : ' Reconstructed from run snapshot (responses attached).'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {groups.map((group) => (
          <div key={group.group} className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{group.group}</p>
            <div className="space-y-2">
              {group.entries.map((entry, index) => (
                <PromptCallCard
                  key={entry.id}
                  label={
                    entry.testCaseId
                      ? `${entry.step} · ${entry.testCaseId}`
                      : entry.step
                  }
                  step={entry.step}
                  tier={entry.tier}
                  outputFormat={
                    entry.messages.some((message) => message.role === 'assistant')
                      ? entry.messages.find((message) => message.role === 'assistant')?.format
                      : undefined
                  }
                  messages={entry.messages}
                  defaultOpen={group.group !== 'Score results' && index === 0}
                  metaLine={[
                    entry.modelId,
                    entry.latencyMs != null ? `${entry.latencyMs} ms` : null,
                    entry.totalCost != null ? formatCostUsd(entry.totalCost) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
