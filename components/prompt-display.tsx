'use client';

import { ReportMarkdown } from '@/components/report-markdown';
import type { ModelTier } from '@/lib/ai';
import { cn } from '@/lib/utils';
import type { LlmTraceMessage } from '@/lib/types';

type PromptMessageBlockProps = {
  message: Pick<LlmTraceMessage, 'role' | 'content' | 'format'>;
  className?: string;
};

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function roleLabel(role: LlmTraceMessage['role']): string {
  if (role === 'system') {
    return 'System';
  }
  if (role === 'user') {
    return 'User';
  }
  return 'Assistant';
}

export function PromptMessageBlock({ message, className }: PromptMessageBlockProps) {
  const format = message.format ?? 'text';
  const body = format === 'json' ? formatJson(message.content) : message.content;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        message.role === 'system'
          ? 'border-border/80 bg-muted/40'
          : message.role === 'assistant'
            ? 'border-primary/25 bg-primary/5'
            : 'border-border bg-card',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {roleLabel(message.role)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{format}</span>
      </div>
      <div className="max-h-96 overflow-auto p-3">
        {format === 'markdown' ? (
          <div className="prose-eval text-sm">
            <ReportMarkdown markdown={message.content} />
          </div>
        ) : (
          <pre
            className={cn(
              'whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground',
              message.format === 'json' && 'text-[10px]',
            )}
          >
            {body}
          </pre>
        )}
      </div>
    </div>
  );
}

type PromptCallCardProps = {
  label: string;
  step: string;
  tier?: ModelTier;
  version?: string;
  hash?: string;
  outputFormat?: string;
  metaLine?: string;
  messages: Array<Pick<LlmTraceMessage, 'role' | 'content' | 'format'>>;
  defaultOpen?: boolean;
};

export function PromptCallCard({
  label,
  step,
  tier,
  version,
  hash,
  outputFormat,
  metaLine,
  messages,
  defaultOpen = false,
}: PromptCallCardProps) {
  return (
    <details
      className="group overflow-hidden rounded-xl border border-border bg-card"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">{label}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{step}</span>
          {tier ? (
            <span className="stat-pill text-[10px] capitalize">{tier} tier</span>
          ) : null}
          {outputFormat ? (
            <span className="stat-pill border-dashed text-[10px]">out: {outputFormat}</span>
          ) : null}
          {version ? <span className="stat-pill text-[10px]">v{version}</span> : null}
          <span className="ml-auto text-muted-foreground transition-transform group-open:rotate-180">
            ▼
          </span>
        </div>
        {hash ? (
          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{hash}</p>
        ) : null}
        {metaLine ? (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{metaLine}</p>
        ) : null}
      </summary>
      <div className="space-y-2 border-t border-border/60 p-3">
        {messages.map((msg, index) => (
          <PromptMessageBlock key={`${step}-${msg.role}-${index}`} message={msg} />
        ))}
      </div>
    </details>
  );
}
