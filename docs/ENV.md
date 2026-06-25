# Environment variables

Canonical reference. Slice 00b generates `.env.example` from this table.

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes (prod) | Vercel AI Gateway API key — all model calls |
| `KV_REST_API_URL` | Yes (from Slice 02) | Vercel KV / Upstash REST URL |
| `KV_REST_API_TOKEN` | Yes (from Slice 02) | Vercel KV REST token |
| `VERCEL_OIDC_TOKEN` | Sandbox | Auto in Vercel prod; `vercel env pull` locally |
| `SLACK_BOT_TOKEN` | Slice 12 | Slack bot `xoxb-…` token |
| `SLACK_SIGNING_SECRET` | Slice 12 | Slack app signing secret |
| `SLACK_CLIENT_ID` | Optional | Multi-workspace OAuth |
| `SLACK_CLIENT_SECRET` | Optional | Multi-workspace OAuth |
| `NEXT_PUBLIC_APP_URL` | Optional | Public app origin for Slack run links (falls back to `VERCEL_URL`) |

## Local development

```bash
vercel link
vercel env pull .env.local
```

Never commit `.env.local`. Placeholders only in `.env.example`.

## Security

- No model provider keys in application code — Gateway only
- OpenAI for multi-vendor scoring is configured in the **Vercel AI Gateway dashboard** (BYOK), not via an app env var
- See [SECURITY.md](../SECURITY.md)
