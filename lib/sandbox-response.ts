import type { CapturedToolCall, SandboxContract } from '@/lib/types';

export const FAST_CHAT_SCOPE_REJECT_ERROR = 'full_path_required';

export type NormalizedSandboxCapture = {
  responseText: string | null;
  scopeRejected: boolean;
  toolCalls?: CapturedToolCall[];
  structured?: unknown;
  validationOk?: boolean;
  validationErrors?: string[];
  validationWarnings?: string[];
};

const SCOPE_REJECT_RESPONSE_PREFIX =
  '[HTTP 422 full_path_required] The fast-chat-only endpoint rejected this prompt before the model ran.';

export function normalizeHarnessCapture(
  statusCode: number | null,
  body: string | null,
): NormalizedSandboxCapture {
  if (!body?.trim()) {
    return { responseText: null, scopeRejected: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { responseText: body, scopeRejected: false };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { responseText: body, scopeRejected: false };
  }

  const record = parsed as Record<string, unknown>;

  if (statusCode !== 200) {
    return { responseText: body, scopeRejected: false };
  }

  const responseText =
    typeof record.response === 'string'
      ? record.response
      : record.structured != null
        ? JSON.stringify(record.structured)
        : null;

  const toolCalls = parseToolCalls(record.toolCalls ?? record.toolsCalled);
  const validation =
    typeof record.validation === 'object' && record.validation !== null
      ? (record.validation as Record<string, unknown>)
      : null;
  const validationOk = typeof validation?.ok === 'boolean' ? validation.ok : undefined;
  const validationErrors = parseValidationMessages(validation?.errors);
  const validationWarnings = parseValidationMessages(validation?.warnings);

  return {
    responseText,
    scopeRejected: false,
    toolCalls,
    structured: record.structured,
    validationOk,
    validationErrors,
    validationWarnings,
  };
}

function parseValidationMessages(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const messages = raw.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return messages.length > 0 ? messages : undefined;
}

function parseToolCalls(raw: unknown): CapturedToolCall[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const calls: CapturedToolCall[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      calls.push({ name: item });
      continue;
    }
    if (typeof item === 'object' && item !== null && 'name' in item) {
      const record = item as Record<string, unknown>;
      if (typeof record.name === 'string') {
        calls.push({
          name: record.name,
          ...(record.input !== undefined ? { input: record.input } : {}),
        });
      }
    }
  }

  return calls.length > 0 ? calls : undefined;
}

export function normalizeSandboxCapture(
  statusCode: number | null,
  body: string | null,
  contract: SandboxContract = 'message-json',
): NormalizedSandboxCapture {
  if (contract === 'harness-json') {
    return normalizeHarnessCapture(statusCode, body);
  }

  if (!body?.trim()) {
    return { responseText: null, scopeRejected: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { responseText: body, scopeRejected: false };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { responseText: body, scopeRejected: false };
  }

  const record = parsed as Record<string, unknown>;

  if (statusCode === 200 && typeof record.response === 'string') {
    return { responseText: record.response, scopeRejected: false };
  }

  if (statusCode === 422 && record.error === FAST_CHAT_SCOPE_REJECT_ERROR) {
    const hint = typeof record.hint === 'string' ? ` ${record.hint}` : '';
    return {
      responseText: `${SCOPE_REJECT_RESPONSE_PREFIX}${hint}`,
      scopeRejected: true,
    };
  }

  return { responseText: body, scopeRejected: false };
}
