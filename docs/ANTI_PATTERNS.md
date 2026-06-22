# Anti-patterns

Do not do these. Agents: check before opening a PR.

## Code

| Anti-pattern | Do instead |
|--------------|------------|
| Hardcode model IDs in `agents/` | `lib/ai.ts` with `tier` param |
| Raw `@vercel/kv.set` in routes | `lib/store.ts` with Zod validation |
| Import `lib/store` in client components | Server component or API fetch |
| Inline SSE parsing in components | Shared SSE helper (Slice 07) |
| Duplicate Zod schemas | Single source in `lib/types.ts` |
| `generateObject` without schema | `generateText` + `Output.object` |
| Large prompts in agent files | `lib/prompts.ts` |

## Testing

| Anti-pattern | Do instead |
|--------------|------------|
| Live Gateway calls in CI | `lib/test/mock-ai.ts` |
| Snapshot raw LLM strings | Assert Zod shape + behavior |
| Skip contract tests on API changes | Update `*.contract.test.ts` |

## Security

| Anti-pattern | Do instead |
|--------------|------------|
| Commit `.env.local` | `.env.example` placeholders only |
| Log full URL or description | Domain only; hash description in spans |
| Store API keys in code | Env vars via Gateway |

## Process

| Anti-pattern | Do instead |
|--------------|------------|
| Multiple slices in one PR | One slice per branch |
| Skip CHANGELOG on merge | Update `[Unreleased]` |
| Push without running gates | `npm run gates` first |
