/**
 * Mock AI SDK helpers for unit/contract tests.
 */

export type MockGenerateTextResult<T = unknown> = {
  text: string;
  output?: T;
  usage?: { inputTokens: number; outputTokens: number };
};

export function mockGenerateText<T>(output: T): MockGenerateTextResult<T> {
  return {
    text: JSON.stringify(output),
    output,
    usage: { inputTokens: 10, outputTokens: 20 },
  };
}

export async function* mockStreamText(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}
