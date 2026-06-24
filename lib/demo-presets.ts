import aideaAgentMatrixPilot from '@/fixtures/aidea-agent-matrix-pilot.json';
import aideaFastChat from '@/fixtures/aidea-fast-chat.json';
import { evalRunInputSchema, type EvalRunInput } from '@/lib/types';

export type DemoPreset = {
  id: string;
  label: string;
  url: string;
  description: string;
  caseCount: number;
  generationMode: 'standard' | 'adversarial';
  scoringMode: 'dual' | 'strong';
};

export type FullRunPreset = {
  id: string;
  label: string;
  hint: string;
  /** Suggested case count when prefilling the start form. */
  defaultCaseCount: number;
  input: EvalRunInput;
};

export type PresetRunOverrides = {
  caseCount?: number;
  generationMode?: 'standard' | 'adversarial';
  scoringMode?: 'dual' | 'strong';
};

export const AIDEA_CO_DEMO: DemoPreset = {
  id: 'aidea-co',
  label: 'Prefill aidea fast-chat demo',
  url: aideaFastChat.url,
  description: aideaFastChat.description,
  caseCount: aideaFastChat.caseCount,
  generationMode: aideaFastChat.generationMode as DemoPreset['generationMode'],
  scoringMode: aideaFastChat.scoringMode as DemoPreset['scoringMode'],
};

const AGENT_MATRIX_PILOT_DEFAULT_CASE_COUNT = 3;

/** Agent-matrix pilot base input (case count / generation / scoring set at run time from the form). */
export const AIDEA_AGENT_MATRIX_PILOT: FullRunPreset = {
  id: 'aidea-agent-matrix-pilot',
  label: 'Run agent-matrix pilot',
  hint: 'Uses case count and generation/scoring toggles below · 3 agents · harness-json dry-run',
  defaultCaseCount: AGENT_MATRIX_PILOT_DEFAULT_CASE_COUNT,
  input: evalRunInputSchema.parse({
    ...aideaAgentMatrixPilot,
    caseCount: AGENT_MATRIX_PILOT_DEFAULT_CASE_COUNT,
  }),
};

const FULL_RUN_PRESETS: Record<string, FullRunPreset> = {
  [AIDEA_AGENT_MATRIX_PILOT.id]: AIDEA_AGENT_MATRIX_PILOT,
};

export function getFullRunPreset(presetId: string): FullRunPreset | undefined {
  return FULL_RUN_PRESETS[presetId];
}

export function buildFullRunInput(
  presetId: string,
  overrides: PresetRunOverrides = {},
): EvalRunInput | undefined {
  const preset = getFullRunPreset(presetId);
  if (!preset) {
    return undefined;
  }

  const parsed = evalRunInputSchema.safeParse({
    ...preset.input,
    ...overrides,
  });
  return parsed.success ? parsed.data : undefined;
}
