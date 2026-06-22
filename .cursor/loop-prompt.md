# EvalKit slice loop

Execute **one PR slice** from [docs/SLICES.md](../docs/SLICES.md) per iteration.

## Each iteration

1. Read `AGENTS.md` bootstrap section and the **next incomplete** slice in `docs/SLICES.md`
2. Confirm you are on the correct branch (or create it from `main`)
3. Implement **only** that slice's acceptance criteria + required tests
4. Run `npm run gates` (and `npm run test:eval` if slice ≥ 10)
5. Update `CHANGELOG.md`, `ROADMAP.md`, and `docs/SLICES.md`
6. **Commit** the slice with a conventional message
7. Stop. Do not start the next slice unless the user asks.

## Do not

- Push or deploy unless the user explicitly asked
- Expand scope beyond the current slice
- Skip dependency order (e.g. implement Slice 07 before 06)
- Finish a slice without committing

## Report

Summarize: slice ID, commit message, gates run, acceptance criteria status, next slice.
