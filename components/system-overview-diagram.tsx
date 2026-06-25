'use client';

import {
  SYSTEM_OVERVIEW,
  type ArchitectureTab,
  type SystemOverviewNode,
} from '@/lib/architecture-graph';
import { cn } from '@/lib/utils';

function rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function VerticalConnector() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <div className="h-6 w-0.5 rounded bg-border" />
    </div>
  );
}

function OverviewNodeCard({
  node,
  onNavigate,
}: {
  node: SystemOverviewNode;
  onNavigate: (tab: ArchitectureTab, id?: string) => void;
}) {
  const clickable = node.backendNodeId ?? node.workflowStepId;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => {
        if (node.backendNodeId) {
          onNavigate('backend-map', node.backendNodeId);
        } else if (node.workflowStepId) {
          onNavigate('workflow', node.workflowStepId);
        }
      }}
      className={cn(
        'rounded-xl border-2 px-3 py-2.5 text-left transition-colors',
        clickable ? 'hover:border-primary/40' : 'cursor-default',
      )}
      style={{
        borderColor: `rgba(${rgb(node.color)},0.45)`,
        background: `rgba(${rgb(node.color)},0.08)`,
      }}
    >
      <p className="text-[12px] font-semibold text-foreground">{node.label}</p>
      {node.sublabel ? (
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{node.sublabel}</p>
      ) : null}
    </button>
  );
}

type SystemOverviewDiagramProps = {
  onNavigate: (tab: ArchitectureTab, id?: string) => void;
};

export function SystemOverviewDiagram({ onNavigate }: SystemOverviewDiagramProps) {
  return (
    <div className="space-y-6">
      <p className="text-[13px] leading-relaxed text-muted-foreground">{SYSTEM_OVERVIEW.tagline}</p>

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">End-to-end flow</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4">
          {SYSTEM_OVERVIEW.dataFlow.map((line) => (
            <li key={line} className="text-[12px] leading-relaxed text-muted-foreground">
              {line}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
          Durable pipeline (Workflow SDK)
        </p>
        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-1">
            {SYSTEM_OVERVIEW.pipelineSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {index > 0 ? (
                  <span className="mx-0.5 text-muted-foreground" aria-hidden>
                    →
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onNavigate('workflow', step.workflowStepId)}
                  className="rounded-lg border-2 px-2.5 py-2 text-center transition-colors hover:border-primary/40"
                  style={{
                    borderColor: `rgba(${rgb(step.color)},0.5)`,
                    background: `rgba(${rgb(step.color)},0.1)`,
                  }}
                >
                  <span className="text-base" aria-hidden>
                    {step.icon}
                  </span>
                  <p className="text-[10px] font-bold text-foreground">{step.label}</p>
                </button>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Click a step to jump to the Workflow tab. Each step checkpoints to KV; sandbox and score write
          incrementally where noted.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wide text-primary">
          System layers
        </p>
        {SYSTEM_OVERVIEW.rows.map((row, rowIndex) => (
          <div key={row.id}>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {row.title}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">{row.description}</p>
              <div
                className={cn(
                  'mt-3 grid gap-2',
                  row.nodes.length === 1
                    ? 'grid-cols-1'
                    : row.nodes.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                )}
              >
                {row.nodes.map((node) => (
                  <OverviewNodeCard key={node.id} node={node} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
            {rowIndex < SYSTEM_OVERVIEW.rows.length - 1 ? <VerticalConnector /> : null}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
          Vercel primitives (build vs buy)
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SYSTEM_OVERVIEW.vercelPrimitives.map((primitive) => (
            <div key={primitive.name} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[12px] font-semibold text-foreground">{primitive.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{primitive.role}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="stat-pill text-[10px]">{primitive.adr}</span>
                {'adr2' in primitive && primitive.adr2 ? (
                  <span className="stat-pill text-[10px]">{primitive.adr2}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          See the{' '}
          <button
            type="button"
            onClick={() => onNavigate('backend-map')}
            className="font-medium text-primary hover:underline"
          >
            Backend map
          </button>{' '}
          tab for interview one-liners and the{' '}
          <button
            type="button"
            onClick={() => onNavigate('decisions')}
            className="font-medium text-primary hover:underline"
          >
            ADRs
          </button>{' '}
          tab for trade-off detail.
        </p>
      </div>
    </div>
  );
}
