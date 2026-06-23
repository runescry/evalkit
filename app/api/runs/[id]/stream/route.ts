import { getRun } from '@/lib/store';
import { formatSseMessage } from '@/lib/sse';

export const runtime = 'nodejs';

const POLL_INTERVAL_MS = 400;
const MAX_POLL_MS = 5 * 60 * 1000;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function countScored(results: { total: number | null }[]): number {
  return results.filter((result) => result.total !== null).length;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now();
      let lastStatus = '';
      let lastMarkdown = '';
      let lastScored = -1;

      const enqueue = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatSseMessage(event, data)));
      };

      while (Date.now() - startedAt < MAX_POLL_MS) {
        const run = await getRun(id);

        if (!run) {
          enqueue('error', { message: 'Run not found' });
          controller.close();
          return;
        }

        const scored = countScored(run.results);
        if (run.status !== lastStatus || scored !== lastScored) {
          lastStatus = run.status;
          lastScored = scored;
          enqueue('run', {
            status: run.status,
            testCases: run.testCases.length,
            results: run.results.length,
            scored,
          });
        }

        const markdown = run.report?.markdown ?? '';
        if (markdown !== lastMarkdown) {
          lastMarkdown = markdown;
          enqueue('report', {
            markdown,
            summary: run.report?.summary,
          });
        }

        if (run.status === 'awaiting_approval' || run.status === 'complete' || run.status === 'failed') {
          enqueue('done', { status: run.status });
          controller.close();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      enqueue('error', { message: 'Stream timed out' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
