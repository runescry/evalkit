# EvalKit

AI eval harness for deployed chatbots. Paste a URL + description → targeted test suite → sandbox execution → rubric scoring → streaming report → human-approved fixes.

## Status

Slice **00b** — Next.js 15 App Router baseline with shadcn/ui.

## Quick start

```bash
nvm use
cp .env.example .env.local   # placeholders only — see docs/ENV.md
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Gates

```bash
npm run gates
```

## For agents

Start with [AGENTS.md](./AGENTS.md).

## Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [Slices](./docs/SLICES.md)
- [Contributing](./docs/CONTRIBUTING.md)
- [Environment variables](./docs/ENV.md)
- [Roadmap](./ROADMAP.md)

## Deploy

```bash
npx vercel link
npx vercel deploy
```

See [vercel.json](./vercel.json) — fluid compute, region `iad1`.
