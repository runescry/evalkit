---
name: evalkit-slice
description: Execute one EvalKit PR slice end-to-end — branch, implement, gates, commit, PR checklist. Use when working on a numbered slice from docs/SLICES.md or when the user says "next slice".
---

# EvalKit slice workflow

## Before coding

1. Read `AGENTS.md` bootstrap order
2. Open `docs/SLICES.md` — find the next incomplete slice + test requirements
3. Create/checkout branch matching the slice (e.g. `infra/scaffold`)

## Implementation

- Implement **only** items listed under that slice
- Use shared helpers from `AGENTS.md` — do not duplicate
- Add tests required for that slice (unit / contract / crud / integration)

## Before commit

```bash
npm run gates
# Slice 10+ also:
npm run test:eval
```

Update `CHANGELOG.md`, `ROADMAP.md`, and `docs/SLICES.md`.

## Commit

One conventional commit per slice:

```
feat(scope): short description of why
```

Do **not** push unless the user explicitly asked.

## PR checklist

- [ ] Slice ID in PR title
- [ ] Acceptance criteria met
- [ ] All applicable gates passed
- [ ] Slice committed on feature branch
- [ ] No secrets or anti-patterns
