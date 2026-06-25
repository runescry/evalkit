'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ADR_ENTRIES,
  BACKEND_CHEAT_SHEET,
  BACKEND_FLOW_ORDER,
  BACKEND_MAP_NODES,
  EVAL_TYPE_ENTRIES,
  INFRA_LAYERS,
  PIPELINE_STAGES,
  VERCEL_TRADEOFFS,
  WORKFLOW_OVERVIEW,
  WORKFLOW_STEPS,
  type AdrEntry,
  type ArchitectureTab,
  type BackendMapNode,
  type PipelineStage,
  type WorkflowStepEntry,
} from '@/lib/architecture-graph';
import { SystemOverviewDiagram } from '@/components/system-overview-diagram';
import { cn } from '@/lib/utils';

function rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function AnimatedConnector({ color, active }: { color: string; active: boolean }) {
  if (!active) {
    return (
      <div className="mx-1 flex h-5 w-8 shrink-0 items-center">
        <div className="h-0.5 w-full rounded bg-border" />
      </div>
    );
  }
  return (
    <div className="relative mx-1 h-5 w-8 shrink-0 overflow-hidden">
      <div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 rounded" style={{ backgroundColor: color }} />
      <span
        className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full"
        style={{
          backgroundColor: color,
          animation: 'evalkit-flow 1.4s linear infinite',
        }}
      />
      <style>{`
        @keyframes evalkit-flow {
          0% { left: 0; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { left: calc(100% - 6px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function StageDetail({ stage, showAntiPattern }: { stage: PipelineStage; showAntiPattern: boolean }) {
  return (
    <div className="space-y-2 border-t border-border/60 px-4 pb-4 pt-3">
      {stage.tier ? (
        <p className="text-[11px] font-medium text-primary">Model tier: {stage.tier}</p>
      ) : null}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">v1 (EvalKit today)</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{stage.v1Approach}</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Production evolution</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{stage.productionApproach}</p>
      </div>
      {showAntiPattern ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Anti-pattern
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{stage.antiPattern}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {stage.adrIds.map((id) => (
          <span key={id} className="stat-pill text-[10px]">
            {id}
          </span>
        ))}
        {stage.infra.map((item) => (
          <span key={item} className="stat-pill border-dashed text-[10px]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function AdrCard({ adr, expanded, onToggle }: { adr: AdrEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 transition-colors',
        expanded ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/25',
      )}
    >
      <button type="button" onClick={onToggle} className="w-full px-4 py-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] text-muted-foreground">{adr.id}</p>
            <p className="text-[13px] font-semibold text-foreground">{adr.title}</p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
              adr.status === 'Accepted'
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {adr.status}
          </span>
        </div>
      </button>
      {expanded ? (
        <div className="space-y-2 border-t border-border/60 px-4 pb-4 pt-2 text-[12px]">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Context: </span>
            {adr.context}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Decision: </span>
            {adr.decision}
          </p>
          <ul className="space-y-1 text-muted-foreground">
            {adr.consequences.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-primary">→</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function WorkflowStepDetail({
  step,
  onSelectAdr,
  onSelectBackendNode,
}: {
  step: WorkflowStepEntry;
  onSelectAdr: (adrId: string) => void;
  onSelectBackendNode: (nodeId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-muted-foreground">{step.doesWhat}</p>
      {step.workflowStep ? (
        <p className="font-mono text-[11px] text-primary">
          workflows/eval-run.ts → {step.workflowStep}
        </p>
      ) : null}
      {step.branchNote ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-muted-foreground">
          {step.branchNote}
        </p>
      ) : null}

      {step.technicalDetails && step.technicalDetails.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            What executes (implementation)
          </p>
          <ul className="mt-2 space-y-1.5">
            {step.technicalDetails.map((line) => (
              <li key={line} className="flex gap-2 text-[11px] leading-relaxed text-foreground/90">
                <span className="shrink-0 text-primary">▸</span>
                <span className="font-mono">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Infrastructure choices
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {step.infrastructure.map((item) => (
            <div key={item.name} className="rounded-lg border border-border bg-muted/30 p-3">
              {item.backendNodeId ? (
                <button
                  type="button"
                  onClick={() => onSelectBackendNode(item.backendNodeId!)}
                  className="text-left text-[13px] font-semibold text-primary hover:underline"
                >
                  {item.name}
                </button>
              ) : (
                <p className="text-[13px] font-semibold">{item.name}</p>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.why}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">KV writes</p>
        <ul className="mt-1 space-y-0.5">
          {step.kvWrites.map((write) => (
            <li key={write} className="font-mono text-[11px] text-foreground/90">
              {write}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Code paths</p>
        <ul className="mt-1 space-y-0.5">
          {step.codePaths.map((path) => (
            <li key={path} className="font-mono text-[11px] text-foreground/90">
              {path}
            </li>
          ))}
        </ul>
      </div>

      {step.relatedAdrs && step.relatedAdrs.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {step.relatedAdrs.map((adrId) => (
            <button
              key={adrId}
              type="button"
              onClick={() => onSelectAdr(adrId)}
              className="stat-pill text-[10px] hover:border-primary/40 hover:bg-primary/10"
            >
              {adrId}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BackendMapNodeCard({
  node,
  selected,
  onSelectAdr,
}: {
  node: BackendMapNode;
  selected: boolean;
  onSelectAdr: (adrId: string) => void;
}) {
  return (
    <article
      id={node.id}
      className={cn(
        'scroll-mt-24 rounded-xl border-2 p-4 transition-colors',
        selected ? 'border-primary/50 bg-primary/5' : 'border-border bg-card',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{node.label}</p>
        <span className="stat-pill text-[10px] capitalize">{node.layer}</span>
      </div>
      <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-[13px] font-medium leading-relaxed text-foreground">
        {node.interviewLine}
      </blockquote>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{node.whatHappens}</p>
      {node.vsBuildYourOwn ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">vs build your own</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{node.vsBuildYourOwn}</p>
          </div>
          {node.tradeoff ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Tradeoff
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{node.tradeoff}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Code paths</p>
        <ul className="mt-1 space-y-0.5">
          {node.codePaths.map((path) => (
            <li key={path} className="font-mono text-[11px] text-foreground/90">
              {path}
            </li>
          ))}
        </ul>
      </div>
      {node.uiPointer ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">In the UI: </span>
          {node.uiPointer}
        </p>
      ) : null}
      {node.relatedAdrs && node.relatedAdrs.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {node.relatedAdrs.map((adrId) => (
            <button
              key={adrId}
              type="button"
              onClick={() => onSelectAdr(adrId)}
              className="stat-pill text-[10px] hover:border-primary/40 hover:bg-primary/10"
            >
              {adrId}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

const TABS: { id: ArchitectureTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'decisions', label: 'ADRs' },
  { id: 'backend-map', label: 'Backend map' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'eval-types', label: 'Eval patterns' },
];

export function ArchitectureDiagram() {
  const [tab, setTab] = useState<ArchitectureTab>('overview');
  const [selectedStage, setSelectedStage] = useState(0);
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0);
  const [expandedStage, setExpandedStage] = useState<string | null>(PIPELINE_STAGES[0]!.id);
  const [showAntiPattern, setShowAntiPattern] = useState(true);
  const [expandedAdr, setExpandedAdr] = useState<string | null>('ADR-001');
  const [evalTypeId, setEvalTypeId] = useState(EVAL_TYPE_ENTRIES[0]!.id);
  const [selectedBackendNode, setSelectedBackendNode] = useState('ai-gateway');
  const [cheatCopied, setCheatCopied] = useState(false);
  const backendDetailRef = useRef<HTMLDivElement>(null);

  const backendFlowNodes = BACKEND_FLOW_ORDER.map(
    (id) => BACKEND_MAP_NODES.find((n) => n.id === id)!,
  ).filter(Boolean);
  const fluidNode = BACKEND_MAP_NODES.find((n) => n.id === 'fluid');

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      return;
    }
    const backendNode = BACKEND_MAP_NODES.find((n) => n.id === hash);
    if (backendNode) {
      setTab('backend-map');
      setSelectedBackendNode(backendNode.id);
      return;
    }
    const workflowIndex = WORKFLOW_STEPS.findIndex((s) => s.id === hash);
    if (workflowIndex >= 0) {
      setTab('workflow');
      setSelectedWorkflowStep(workflowIndex);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'backend-map') {
      return;
    }
    const el = document.getElementById(selectedBackendNode);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [tab, selectedBackendNode]);

  const goToAdr = useCallback((adrId: string) => {
    setTab('decisions');
    setExpandedAdr(adrId);
  }, []);

  const goToBackendNode = useCallback((nodeId: string) => {
    setTab('backend-map');
    setSelectedBackendNode(nodeId);
  }, []);

  const navigateOverview = useCallback(
    (targetTab: ArchitectureTab, id?: string) => {
      setTab(targetTab);
      if (targetTab === 'backend-map' && id) {
        setSelectedBackendNode(id);
      }
      if (targetTab === 'workflow' && id) {
        const index = WORKFLOW_STEPS.findIndex((step) => step.id === id);
        if (index >= 0) {
          setSelectedWorkflowStep(index);
        }
      }
    },
    [],
  );

  const selectWorkflowStep = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, WORKFLOW_STEPS.length - 1));
    setSelectedWorkflowStep(clamped);
  }, []);

  const advanceWorkflowStep = useCallback(() => {
    setSelectedWorkflowStep((s) => Math.min(s + 1, WORKFLOW_STEPS.length - 1));
  }, []);

  const selectPipelineStage = useCallback((index: number) => {
    setSelectedStage(Math.max(0, Math.min(index, PIPELINE_STAGES.length - 1)));
  }, []);

  const copyCheatSheet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(BACKEND_CHEAT_SHEET.join('\n'));
      setCheatCopied(true);
      window.setTimeout(() => setCheatCopied(false), 2000);
    } catch {
      setCheatCopied(false);
    }
  }, []);

  const advanceStage = useCallback(() => {
    setSelectedStage((s) => Math.min(s + 1, PIPELINE_STAGES.length - 1));
  }, []);

  useEffect(() => {
    if (tab !== 'workflow') {
      return;
    }
    const step = WORKFLOW_STEPS[selectedWorkflowStep];
    if (!step) {
      return;
    }
    document.getElementById(step.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [tab, selectedWorkflowStep]);

  useEffect(() => {
    if (tab !== 'pipeline') {
      return;
    }
    const stage = PIPELINE_STAGES[selectedStage];
    if (!stage) {
      return;
    }
    setExpandedStage(stage.id);
    document.getElementById(`pipeline-stage-${stage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [tab, selectedStage]);

  const evalType = EVAL_TYPE_ENTRIES.find((e) => e.id === evalTypeId) ?? EVAL_TYPE_ENTRIES[0]!;

  return (
    <div className="eval-card space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-title text-xl font-bold tracking-tight">EvalKit system architecture</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Durable workflow pipeline, multi-model scoring, sandbox isolation, human approval — with explicit
            tradeoffs at each stage.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tab === 'workflow' ? (
            <>
              <button
                type="button"
                onClick={advanceWorkflowStep}
                disabled={selectedWorkflowStep >= WORKFLOW_STEPS.length - 1}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Next step ({selectedWorkflowStep + 1}/{WORKFLOW_STEPS.length})
              </button>
              <button
                type="button"
                onClick={() => selectWorkflowStep(0)}
                className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Reset
              </button>
            </>
          ) : null}
          {tab === 'pipeline' ? (
            <>
              <button
                type="button"
                onClick={advanceStage}
                disabled={selectedStage >= PIPELINE_STAGES.length - 1}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Next step ({selectedStage + 1}/{PIPELINE_STAGES.length})
              </button>
              <button
                type="button"
                onClick={() => selectPipelineStage(0)}
                className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Reset
              </button>
            </>
          ) : null}
          {/* Linear section nav — always visible */}
          {(() => {
            const currentIndex = TABS.findIndex((t) => t.id === tab);
            const prevTab = TABS[currentIndex - 1];
            const nextTab = TABS[currentIndex + 1];
            return (
              <div className="flex items-center gap-1 border-l border-border pl-2">
                <button
                  type="button"
                  disabled={!prevTab}
                  onClick={() => prevTab && setTab(prevTab.id)}
                  className="rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  title={prevTab ? `← ${prevTab.label}` : undefined}
                >
                  ←
                </button>
                <span className="text-[11px] font-medium text-muted-foreground">{currentIndex + 1}/{TABS.length}</span>
                <button
                  type="button"
                  disabled={!nextTab}
                  onClick={() => nextTab && setTab(nextTab.id)}
                  className="rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  title={nextTab ? `${nextTab.label} →` : undefined}
                >
                  →
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <SystemOverviewDiagram onNavigate={navigateOverview} />
      ) : null}

      {tab === 'workflow' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {WORKFLOW_OVERVIEW.title}
            </p>
            <ul className="mt-2 space-y-1.5">
              {WORKFLOW_OVERVIEW.bullets.map((line) => (
                <li key={line} className="text-[11px] leading-relaxed text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              Why Vercel primitives (vs build your own)
            </p>
            <div className="mt-3 space-y-2">
              {VERCEL_TRADEOFFS.map((entry) => (
                <div
                  key={entry.component}
                  className="rounded-lg border border-border bg-card p-3 text-[11px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.backendNodeId ? (
                      <button
                        type="button"
                        onClick={() => goToBackendNode(entry.backendNodeId!)}
                        className="font-semibold text-primary hover:underline"
                      >
                        {entry.component}
                      </button>
                    ) : (
                      <span className="font-semibold">{entry.component}</span>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">Why: </span>
                    {entry.whyVercel}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">vs DIY: </span>
                    {entry.vsBuildYourOwn}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">Tradeoff: </span>
                    {entry.tradeoff}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground">
            Each step maps to <span className="font-mono">workflows/eval-run.ts</span> — what runs, which
            infrastructure it uses, and what gets written to KV.
          </p>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-center">
              {WORKFLOW_STEPS.map((step, i) => {
                const isSelected = i === selectedWorkflowStep;
                const isPast = i < selectedWorkflowStep;
                return (
                  <div key={step.id} className="flex items-center">
                    {i > 0 ? (
                      <AnimatedConnector
                        color={WORKFLOW_STEPS[i - 1]!.color}
                        active={isPast || isSelected}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => selectWorkflowStep(i)}
                      className="rounded-xl border-2 px-2.5 py-2 text-center transition-all"
                      style={{
                        borderColor: isSelected ? step.color : isPast ? `${step.color}99` : 'var(--border)',
                        background: isSelected
                          ? `rgba(${rgb(step.color)},0.14)`
                          : isPast
                            ? `rgba(${rgb(step.color)},0.06)`
                            : 'var(--card)',
                        opacity: !isSelected && !isPast ? 0.55 : 1,
                        minWidth: 80,
                      }}
                    >
                      <span className="text-base" aria-hidden>
                        {step.icon}
                      </span>
                      <p className="mt-0.5 text-[10px] font-bold leading-tight text-foreground">{step.label}</p>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {WORKFLOW_STEPS[selectedWorkflowStep] ? (
            <article
              id={WORKFLOW_STEPS[selectedWorkflowStep]!.id}
              className="scroll-mt-24 rounded-xl border-2 p-4"
              style={{
                borderColor: WORKFLOW_STEPS[selectedWorkflowStep]!.color,
                background: `rgba(${rgb(WORKFLOW_STEPS[selectedWorkflowStep]!.color)},0.08)`,
              }}
            >
              <p className="text-sm font-semibold">{WORKFLOW_STEPS[selectedWorkflowStep]!.label}</p>
              <WorkflowStepDetail
                step={WORKFLOW_STEPS[selectedWorkflowStep]!}
                onSelectAdr={goToAdr}
                onSelectBackendNode={goToBackendNode}
              />
            </article>
          ) : null}

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">All workflow stages</p>
            {WORKFLOW_STEPS.map((step, i) => (
              <button
                key={step.id}
                type="button"
                onClick={() => selectWorkflowStep(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors',
                  i === selectedWorkflowStep ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/25',
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: step.color }}
                >
                  {step.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{step.label}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {step.infrastructure.map((infra) => infra.name).join(' · ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'pipeline' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-center">
              {PIPELINE_STAGES.map((stage, i) => {
                const isSelected = i === selectedStage;
                const isPast = i < selectedStage;
                return (
                  <div key={stage.id} className="flex items-center">
                    {i > 0 ? (
                      <AnimatedConnector color={PIPELINE_STAGES[i - 1]!.color} active={isPast || isSelected} />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => selectPipelineStage(i)}
                      className="rounded-xl border-2 px-3 py-2 text-center transition-all"
                      style={{
                        borderColor: isSelected ? stage.color : isPast ? `${stage.color}99` : 'var(--border)',
                        background: isSelected
                          ? `rgba(${rgb(stage.color)},0.14)`
                          : isPast
                            ? `rgba(${rgb(stage.color)},0.06)`
                            : 'var(--card)',
                        opacity: !isSelected && !isPast ? 0.55 : 1,
                        minWidth: 88,
                      }}
                    >
                      <span className="text-lg" aria-hidden>
                        {stage.icon}
                      </span>
                      <p className="mt-0.5 text-[10px] font-bold leading-tight text-foreground">{stage.label}</p>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {PIPELINE_STAGES[selectedStage] ? (
            <div
              id={`pipeline-stage-${PIPELINE_STAGES[selectedStage]!.id}`}
              className="scroll-mt-24 rounded-xl border-2 p-4"
              style={{
                borderColor: PIPELINE_STAGES[selectedStage]!.color,
                background: `rgba(${rgb(PIPELINE_STAGES[selectedStage]!.color)},0.08)`,
              }}
            >
              <p className="text-sm font-semibold">{PIPELINE_STAGES[selectedStage]!.label}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {PIPELINE_STAGES[selectedStage]!.v1Approach}
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">Expand any stage for v1 vs production</p>
            <button
              type="button"
              onClick={() => setShowAntiPattern((v) => !v)}
              className="text-[11px] font-medium text-amber-800 dark:text-amber-200"
            >
              {showAntiPattern ? 'Hide anti-patterns' : 'Show anti-patterns'}
            </button>
          </div>

          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage) => {
              const open = expandedStage === stage.id;
              return (
                <div
                  key={stage.id}
                  className="overflow-hidden rounded-xl border-2 transition-colors"
                  style={{ borderColor: open ? stage.color : 'var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedStage(open ? null : stage.id)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: stage.color }}
                    >
                      {stage.icon}
                    </span>
                    <span className="flex-1 text-[13px] font-semibold">{stage.label}</span>
                    <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
                  </button>
                  {open ? <StageDetail stage={stage} showAntiPattern={showAntiPattern} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === 'backend-map' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                Interview cheat sheet
              </p>
              <button
                type="button"
                onClick={() => void copyCheatSheet()}
                className="rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                {cheatCopied ? 'Copied' : 'Copy all'}
              </button>
            </div>
            <ul className="mt-2 space-y-1.5">
              {BACKEND_CHEAT_SHEET.map((line) => (
                <li key={line} className="text-[12px] leading-relaxed text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {fluidNode ? (
            <p className="text-center text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => setSelectedBackendNode(fluidNode.id)}
                className="stat-pill border-dashed hover:border-primary/40"
              >
                {fluidNode.label} hosts API routes + Workflow
              </button>
            </p>
          ) : null}

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-center">
              {backendFlowNodes.map((node, i) => {
                const isSelected = node.id === selectedBackendNode;
                const selectedIndex = backendFlowNodes.findIndex((n) => n.id === selectedBackendNode);
                const isPast = i < selectedIndex;
                return (
                  <div key={node.id} className="flex items-center">
                    {i > 0 ? (
                      <AnimatedConnector color={backendFlowNodes[i - 1]!.color} active={isPast || isSelected} />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedBackendNode(node.id)}
                      className="rounded-xl border-2 px-2.5 py-2 text-center transition-all"
                      style={{
                        borderColor: isSelected ? node.color : isPast ? `${node.color}99` : 'var(--border)',
                        background: isSelected
                          ? `rgba(${rgb(node.color)},0.14)`
                          : isPast
                            ? `rgba(${rgb(node.color)},0.06)`
                            : 'var(--card)',
                        opacity: !isSelected && !isPast ? 0.55 : 1,
                        minWidth: 72,
                      }}
                    >
                      <p className="text-[10px] font-bold leading-tight text-foreground">{node.label}</p>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={backendDetailRef} className="space-y-3">
            {BACKEND_MAP_NODES.map((node) => (
              <BackendMapNodeCard
                key={node.id}
                node={node}
                selected={node.id === selectedBackendNode}
                onSelectAdr={goToAdr}
              />
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'decisions' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {ADR_ENTRIES.map((adr) => (
            <AdrCard
              key={adr.id}
              adr={adr}
              expanded={expandedAdr === adr.id}
              onToggle={() => setExpandedAdr(expandedAdr === adr.id ? null : adr.id)}
            />
          ))}
        </div>
      ) : null}

      {tab === 'infrastructure' ? (
        <div className="space-y-4">
          {INFRA_LAYERS.map((layer) => (
            <div key={layer.layer} className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{layer.layer}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {layer.components.map((c) => (
                  <div key={c.name} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[13px] font-semibold">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{c.role}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-foreground/80">{c.why}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'eval-types' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {EVAL_TYPE_ENTRIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setEvalTypeId(entry.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  evalTypeId === entry.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {entry.name}
              </button>
            ))}
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{evalType.tagline}</p>
            <h3 className="mt-1 text-lg font-semibold">{evalType.name}</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{evalType.evalKitMapping}</p>
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-foreground">Watch out for</p>
              <ul className="mt-2 space-y-1.5">
                {evalType.pitfalls.map((p) => (
                  <li key={p} className="flex gap-2 text-[12px] text-muted-foreground">
                    <span className="text-amber-600">!</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
