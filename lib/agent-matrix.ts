import type {
  AgentTarget,
  EvalRunInput,
  KbFixture,
  SandboxContract,
  TestCase,
} from '@/lib/types';

export const SANDBOX_FANOUT_HARNESS = 2;

export function isAgentMatrixMode(input: EvalRunInput): boolean {
  if (input.evalMode === 'agent-matrix') {
    return true;
  }
  if (input.evalMode === 'single') {
    return false;
  }
  return (input.agents?.length ?? 0) > 1;
}

export function agentTargetMap(input: EvalRunInput): Map<string, AgentTarget> {
  const map = new Map<string, AgentTarget>();
  if (input.agents?.length) {
    for (const agent of input.agents) {
      map.set(agent.id, agent);
    }
  }
  return map;
}

export type ResolvedSandboxTarget = {
  targetUrl: string;
  contract: SandboxContract;
  description: string;
  agentId?: string;
};

export function resolveSandboxTarget(
  input: EvalRunInput,
  testCase: TestCase,
): ResolvedSandboxTarget {
  const agents = agentTargetMap(input);

  if (testCase.agentId) {
    const agent = agents.get(testCase.agentId);
    if (!agent) {
      throw new Error(`Unknown agentId on test case ${testCase.id}: ${testCase.agentId}`);
    }
    return {
      targetUrl: agent.url,
      contract: agent.contract ?? input.sandboxContract,
      description: agent.description,
      agentId: agent.id,
    };
  }

  if (agents.size === 1) {
    const agent = [...agents.values()][0]!;
    return {
      targetUrl: agent.url,
      contract: agent.contract ?? input.sandboxContract,
      description: agent.description,
      agentId: agent.id,
    };
  }

  return {
    targetUrl: input.url,
    contract: input.sandboxContract,
    description: input.description,
  };
}

export function descriptionForTestCase(
  input: EvalRunInput,
  testCase: TestCase,
): string {
  return resolveSandboxTarget(input, testCase).description;
}

export function sandboxFanoutForInput(input: EvalRunInput): number {
  if (input.sandboxTimeoutMs > 30_000) {
    return SANDBOX_FANOUT_HARNESS;
  }
  return 5;
}

export function buildAgentCatalogForPrompt(agents: AgentTarget[]): string {
  return agents
    .map(
      (agent) =>
        `- ${agent.id}${agent.label ? ` (${agent.label})` : ''}: ${agent.description}`,
    )
    .join('\n');
}

export function resolveKbFixture(
  input: EvalRunInput,
  testCase: TestCase,
  agentId?: string,
): KbFixture | undefined {
  if (testCase.kbFixture) {
    return testCase.kbFixture;
  }
  if (agentId) {
    const agent = agentTargetMap(input).get(agentId);
    if (agent?.kbFixture) {
      return agent.kbFixture;
    }
  }
  return input.defaultKbFixture;
}

export function buildSandboxRequestBody(
  runInput: EvalRunInput,
  contract: SandboxContract,
  testCase: TestCase,
  agentId?: string,
): Record<string, unknown> {
  if (contract === 'harness-json') {
    if (!agentId) {
      throw new Error(`harness-json requires agentId for test case ${testCase.id}`);
    }
    const body: Record<string, unknown> = {
      agentId,
      mission: testCase.input,
      realWorldMode: 'dry-run',
      applyOverrides: false,
    };
    const kbFixture = resolveKbFixture(runInput, testCase, agentId);
    if (kbFixture) {
      body.kbFixture = kbFixture;
    }
    return body;
  }
  return { message: testCase.input };
}
