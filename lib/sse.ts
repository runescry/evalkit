export type RunStreamRunEvent = {
  status: string;
  testCases: number;
  results: number;
  scored: number;
};

export type RunStreamReportEvent = {
  markdown: string;
  summary?: string;
};

export type RunStreamDoneEvent = {
  status: string;
};

export type RunStreamErrorEvent = {
  message: string;
};

export type RunStreamHandlers = {
  onRun?: (data: RunStreamRunEvent) => void;
  onReport?: (data: RunStreamReportEvent) => void;
  onDone?: (data: RunStreamDoneEvent) => void;
  onError?: (data: RunStreamErrorEvent) => void;
};

export function formatSseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Subscribe to run progress SSE — use in client components only. */
export function subscribeRunStream(
  runId: string,
  handlers: RunStreamHandlers,
): () => void {
  const source = new EventSource(`/api/runs/${runId}/stream`);

  source.addEventListener('run', (event) => {
    handlers.onRun?.(JSON.parse(event.data) as RunStreamRunEvent);
  });

  source.addEventListener('report', (event) => {
    handlers.onReport?.(JSON.parse(event.data) as RunStreamReportEvent);
  });

  source.addEventListener('done', (event) => {
    handlers.onDone?.(JSON.parse(event.data) as RunStreamDoneEvent);
    source.close();
  });

  source.addEventListener('error', (event) => {
    if (event instanceof MessageEvent && event.data) {
      handlers.onError?.(JSON.parse(event.data) as RunStreamErrorEvent);
    } else {
      handlers.onError?.({ message: 'Stream connection failed' });
    }
    source.close();
  });

  return () => source.close();
}
