'use client';

import {
  SYSTEM_OVERVIEW,
  type ArchitectureTab,
} from '@/lib/architecture-graph';
import { cn } from '@/lib/utils';

function rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

type SystemOverviewDiagramProps = {
  onNavigate: (tab: ArchitectureTab, id?: string) => void;
};

export function SystemOverviewDiagram({ onNavigate }: SystemOverviewDiagramProps) {
  return (
    <div className="space-y-5">

      {/* Context: what evaluates what */}
      <div className="flex items-stretch gap-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-[#0d9488]/40 bg-[#0d9488]/10 px-4 py-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0d9488]">Target chatbot</p>
          <p className="mt-1 text-base font-bold text-foreground">aidea</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">aidea-co.vercel.app</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Multi-agent personal assistant.<br />
            Exposes <code className="text-[10px]">/api/eval/agent</code> for EvalKit.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-2">
          <div className="h-0.5 w-12 rounded bg-gradient-to-r from-[#0d9488]/40 to-primary/40" />
          <p className="rotate-0 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">evaluates</p>
          <div className="text-muted-foreground">→</div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-primary/40 bg-primary/10 px-4 py-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Eval harness</p>
          <p className="mt-1 text-base font-bold text-foreground">EvalKit</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">this system</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            URL + contract → test cases →<br />
            sandbox → score → report → fixes
          </p>
        </div>
      </div>

      {/* Pipeline hero */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Eval pipeline</p>
          <button
            type="button"
            onClick={() => onNavigate('pipeline')}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Step-by-step walkthrough →
          </button>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-center gap-0.5">
            {SYSTEM_OVERVIEW.pipelineSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {index > 0 ? (
                  <span className="mx-1.5 text-sm text-muted-foreground" aria-hidden>→</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onNavigate('workflow', step.workflowStepId)}
                  className="group flex flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition-all hover:scale-[1.04] hover:shadow-sm"
                  style={{
                    borderColor: `rgba(${rgb(step.color)},0.55)`,
                    background: `rgba(${rgb(step.color)},0.10)`,
                    minWidth: 76,
                  }}
                >
                  <span className="text-2xl" aria-hidden>{step.icon}</span>
                  <p className="mt-1.5 text-[11px] font-bold leading-tight text-foreground">{step.label}</p>
                </button>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Click any step to see implementation detail, infrastructure choice, and KV writes.
        </p>
      </div>

      {/* Vercel primitives */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-primary">Vercel primitives — build vs buy</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SYSTEM_OVERVIEW.vercelPrimitives.map((primitive) => (
            <div
              key={primitive.name}
              className="rounded-lg border border-border bg-card p-3"
            >
              <p className="text-[12px] font-semibold text-foreground">{primitive.name}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{primitive.role}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="stat-pill text-[9px]">{primitive.adr}</span>
                {'adr2' in primitive && primitive.adr2 ? (
                  <span className="stat-pill text-[9px]">{primitive.adr2}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model tier routing */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-primary">Model tier routing — <code className="normal-case font-mono">lib/ai.ts</code></p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { tier: 'fast', model: 'Haiku 4.5', fallback: 'Gemini Flash → Sonnet', use: 'Standard case generation', color: '#5c7c5c' },
            { tier: 'strong', model: 'Sonnet 4.6', fallback: '—', use: 'Adversarial gen · scoring · report · fixes', color: '#b45309' },
            { tier: 'openai', model: 'GPT-4.1', fallback: '—', use: 'Multi-vendor judge (BYOK)', color: '#4338ca' },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-lg border-2 p-3"
              style={{ borderColor: `rgba(${rgb(t.color)},0.4)`, background: `rgba(${rgb(t.color)},0.06)` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.tier}
                </span>
                <span className="text-[12px] font-semibold text-foreground">{t.model}</span>
              </div>
              {t.fallback !== '—' ? (
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">↳ {t.fallback}</p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t.use}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Use{' '}
        <button type="button" onClick={() => onNavigate('pipeline')} className="font-medium text-primary hover:underline">Pipeline</button>
        {' '}to walk through each step ·{' '}
        <button type="button" onClick={() => onNavigate('backend-map')} className="font-medium text-primary hover:underline">Backend map</button>
        {' '}for interview one-liners ·{' '}
        <button type="button" onClick={() => onNavigate('decisions')} className="font-medium text-primary hover:underline">ADRs</button>
        {' '}for trade-off detail
      </p>
    </div>
  );
}
