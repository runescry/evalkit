import { describe, expect, it } from 'vitest';
import {
  AIDEA_AGENT_MATRIX_PILOT,
  buildFullRunInput,
  getFullRunPreset,
} from '@/lib/demo-presets';

describe('lib/demo-presets', () => {
  it('exposes agent-matrix pilot with harness-json and three agents', () => {
    const { input } = AIDEA_AGENT_MATRIX_PILOT;
    expect(input.evalMode).toBe('agent-matrix');
    expect(input.sandboxContract).toBe('harness-json');
    expect(input.agents).toHaveLength(3);
    expect(input.caseCount).toBe(3);
    expect(input.defaultKbFixture).toBeDefined();
  });

  it('resolves preset by id', () => {
    expect(getFullRunPreset('aidea-agent-matrix-pilot')?.id).toBe(
      AIDEA_AGENT_MATRIX_PILOT.id,
    );
    expect(getFullRunPreset('unknown')).toBeUndefined();
  });

  it('merges form overrides into preset input', () => {
    const input = buildFullRunInput('aidea-agent-matrix-pilot', {
      caseCount: 12,
      generationMode: 'standard',
      scoringMode: 'strong',
    });
    expect(input?.caseCount).toBe(12);
    expect(input?.generationMode).toBe('standard');
    expect(input?.scoringMode).toBe('strong');
    expect(input?.evalMode).toBe('agent-matrix');
  });
});
