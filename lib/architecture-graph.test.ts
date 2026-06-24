import { describe, expect, it } from 'vitest';
import {
  BACKEND_FLOW_EDGES,
  BACKEND_FLOW_ORDER,
  BACKEND_MAP_NODES,
  PIPELINE_STAGES,
  VERCEL_TRADEOFFS,
  WORKFLOW_OVERVIEW,
  WORKFLOW_STEPS,
} from '@/lib/architecture-graph';

describe('lib/architecture-graph backend map', () => {
  const nodeIds = new Set(BACKEND_MAP_NODES.map((n) => n.id));

  it('includes required interview nodes', () => {
    expect(nodeIds.has('fluid')).toBe(true);
    expect(nodeIds.has('ai-gateway')).toBe(true);
    expect(nodeIds.has('sandbox')).toBe(true);
    expect(nodeIds.has('agent-matrix')).toBe(true);
  });

  it('gives every node an interview line and code path', () => {
    for (const node of BACKEND_MAP_NODES) {
      expect(node.interviewLine.length).toBeGreaterThan(20);
      expect(node.codePaths.length).toBeGreaterThan(0);
      expect(node.whatHappens.length).toBeGreaterThan(20);
    }
  });

  it('has valid flow edges and order', () => {
    for (const id of BACKEND_FLOW_ORDER) {
      expect(nodeIds.has(id)).toBe(true);
    }
    for (const edge of BACKEND_FLOW_EDGES) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it('documents harness sandbox in pipeline stage', () => {
    const sandbox = PIPELINE_STAGES.find((s) => s.id === 'sandbox');
    expect(sandbox?.v1Approach).toContain('harness-json');
    expect(sandbox?.v1Approach).toContain('90s');
  });
});

describe('lib/architecture-graph workflow view', () => {
  it('covers eval-run workflow from trigger through fixes', () => {
    const ids = WORKFLOW_STEPS.map((s) => s.id);
    expect(ids).toContain('trigger');
    expect(ids).toContain('generate-test-cases');
    expect(ids).toContain('run-sandbox');
    expect(ids).toContain('await-approval');
    expect(ids).toContain('apply-fixes');
  });

  it('documents infrastructure and KV writes per step', () => {
    for (const step of WORKFLOW_STEPS) {
      expect(step.doesWhat.length).toBeGreaterThan(20);
      expect(step.infrastructure.length).toBeGreaterThan(0);
      expect(step.kvWrites.length).toBeGreaterThan(0);
      expect(step.codePaths.length).toBeGreaterThan(0);
    }
  });

  it('links sandbox step to agent-matrix infrastructure', () => {
    const sandbox = WORKFLOW_STEPS.find((s) => s.id === 'run-sandbox');
    expect(sandbox?.infrastructure.some((i) => i.backendNodeId === 'agent-matrix')).toBe(true);
  });

  it('documents workflow SDK execution model', () => {
    expect(WORKFLOW_OVERVIEW.bullets.length).toBeGreaterThan(5);
    expect(WORKFLOW_OVERVIEW.bullets.some((b) => b.includes('use step'))).toBe(true);
    expect(WORKFLOW_OVERVIEW.bullets.some((b) => b.includes('resumeHook'))).toBe(true);
  });

  it('has technical details on every workflow step', () => {
    for (const step of WORKFLOW_STEPS) {
      expect(step.technicalDetails?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('documents Vercel build-vs-buy tradeoffs', () => {
    expect(VERCEL_TRADEOFFS.length).toBeGreaterThanOrEqual(5);
    const workflow = VERCEL_TRADEOFFS.find((t) => t.component === 'Workflow SDK');
    expect(workflow?.vsBuildYourOwn).toContain('Temporal');
  });
});
