'use server';

import { redirect } from 'next/navigation';
import { start } from 'workflow/api';
import { buildFullRunInput } from '@/lib/demo-presets';
import { createRun } from '@/lib/store';
import { evalRunInputSchema, type EvalRunInput } from '@/lib/types';
import { evalRunWorkflow } from '@/workflows/eval-run';

export type CreateRunFormState = {
  error?: string;
};

async function startEvalRun(input: EvalRunInput): Promise<CreateRunFormState> {
  let run;
  try {
    run = await createRun(input);
    await start(evalRunWorkflow, [run.id]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start eval run';
    return { error: message };
  }

  redirect(`/runs/${run.id}`);
}

export async function createRunAction(
  _prevState: CreateRunFormState,
  formData: FormData,
): Promise<CreateRunFormState> {
  const raw = {
    url: String(formData.get('url') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    caseCount: Number(formData.get('caseCount') ?? 10),
    generationMode: String(formData.get('generationMode') ?? 'standard'),
    scoringMode: String(formData.get('scoringMode') ?? 'dual'),
  };

  const parsed = evalRunInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  return startEvalRun(parsed.data);
}

export async function startPresetRunAction(
  _prevState: CreateRunFormState,
  formData: FormData,
): Promise<CreateRunFormState> {
  const presetId = String(formData.get('presetId') ?? '').trim();
  const caseCount = Number(formData.get('caseCount'));
  const generationMode = String(formData.get('generationMode') ?? 'standard');
  const scoringMode = String(formData.get('scoringMode') ?? 'dual');

  const input = buildFullRunInput(presetId, {
    caseCount: Number.isFinite(caseCount) ? caseCount : undefined,
    generationMode:
      generationMode === 'adversarial' || generationMode === 'standard'
        ? generationMode
        : undefined,
    scoringMode:
      scoringMode === 'dual' || scoringMode === 'strong' ? scoringMode : undefined,
  });

  if (!input) {
    return { error: 'Unknown demo preset or invalid run options' };
  }

  return startEvalRun(input);
}
