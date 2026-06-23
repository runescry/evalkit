import { after } from 'next/server';
import { start } from 'workflow/api';
import { createRun, getRun } from '@/lib/store';
import {
  parseEvalCommandText,
  postSlackMessage,
  postSlackThreadedRunUpdates,
  verifySlackSignature,
} from '@/lib/slack';
import { evalRunWorkflow } from '@/workflows/eval-run';

export const runtime = 'nodejs';

function appOrigin(): string | undefined {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return undefined;
}

function slackEnv() {
  const token = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!token || !signingSecret) {
    return null;
  }
  return { token, signingSecret };
}

export async function POST(request: Request) {
  const env = slackEnv();
  if (!env) {
    return Response.json({ error: 'Slack is not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-slack-signature');
  const timestamp = request.headers.get('x-slack-request-timestamp');

  if (
    !verifySlackSignature({
      signingSecret: env.signingSecret,
      signature,
      timestamp,
      rawBody,
    })
  ) {
    return Response.json({ error: 'Invalid Slack signature' }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const text = params.get('text') ?? '';
  const channel = params.get('channel_id');
  const userId = params.get('user_id');

  if (!channel) {
    return Response.json({ error: 'Missing channel_id' }, { status: 400 });
  }

  const command = parseEvalCommandText(text);
  if (!command) {
    return Response.json({
      response_type: 'ephemeral',
      text: 'Usage: `/eval <url> | <description> [--cases=N]`',
    });
  }

  const run = await createRun(command);
  await start(evalRunWorkflow, [run.id]);

  const origin = appOrigin();
  const started = await postSlackMessage({
    token: env.token,
    channel,
    text: `Eval started for <@${userId ?? 'user'}>: \`${run.id}\`${origin ? ` — <${origin}/runs/${run.id}|view report>` : ''}`,
  });

  if (started.ok && started.ts) {
    after(async () => {
      await postSlackThreadedRunUpdates({
        token: env.token,
        channel,
        threadTs: started.ts!,
        runId: run.id,
        getRun: async (runId) => {
          const current = await getRun(runId);
          return current ? { status: current.status } : null;
        },
        appOrigin: origin,
      });
    });
  }

  return Response.json({
    response_type: 'ephemeral',
    text: `Started eval \`${run.id}\`. Watch the channel thread for status updates.`,
  });
}
