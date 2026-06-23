'use server';

import { redirect } from 'next/navigation';
import { start } from 'workflow/api';
import { createRun } from '@/lib/store';
import { evalRunInputSchema } from '@/lib/types';
import { evalRunWorkflow } from '@/workflows/eval-run';

export type CreateRunFormState = {
  error?: string;
};

export async function createRunAction(
  _prevState: CreateRunFormState,
  formData: FormData,
): Promise<CreateRunFormState> {
  const raw = {
    url: String(formData.get('url') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    caseCount: Number(formData.get('caseCount') ?? 10),
  };

  const parsed = evalRunInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  let run;
  try {
    run = await createRun(parsed.data);
    await start(evalRunWorkflow, [run.id]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start eval run';
    return { error: message };
  }

  redirect(`/runs/${run.id}`);
}
