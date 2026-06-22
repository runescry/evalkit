import type { EvalRun, EvalRunUpdate } from '@/lib/types';

export type WorkflowStoreBridge = {
  getRun: (runId: string) => Promise<EvalRun | null>;
  updateRun: (runId: string, patch: EvalRunUpdate) => Promise<EvalRun>;
};

declare global {
  var __EVALKIT_WORKFLOW_STORE__: WorkflowStoreBridge | undefined;
}

async function loadProductionStore(): Promise<WorkflowStoreBridge> {
  const store = await import('@/lib/store');
  return {
    getRun: store.getRun,
    updateRun: store.updateRun,
  };
}

async function getBridge(): Promise<WorkflowStoreBridge> {
  if (globalThis.__EVALKIT_WORKFLOW_STORE__) {
    return globalThis.__EVALKIT_WORKFLOW_STORE__;
  }
  return loadProductionStore();
}

export async function getRun(runId: string): Promise<EvalRun | null> {
  const bridge = await getBridge();
  return bridge.getRun(runId);
}

export async function updateRun(runId: string, patch: EvalRunUpdate): Promise<EvalRun> {
  const bridge = await getBridge();
  return bridge.updateRun(runId, patch);
}
