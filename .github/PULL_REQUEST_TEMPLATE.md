## Slice

<!-- e.g. 04 — feature/test-case-generator -->

**Branch:** `feature/…`

## Summary

<!-- 1–3 bullets: what and why -->

## Acceptance criteria

<!-- Copy from docs/SLICES.md; check off -->

- [ ] …

## Gates (all applicable must pass)

- [ ] `npm run gates` locally before commit
- [ ] `Quality gates` (CI)
- [ ] `Dependency audit` (CI)
- [ ] `Gitleaks` (secret scan)
- [ ] `SAST` (CodeQL, PRs to `main`)
- [ ] `Dependency review` (PRs)
- [ ] `npm run test:eval` (Slice 10+)

## Commit

- [ ] One conventional commit on this branch for the slice

## Trade-offs / ADRs

<!-- Link docs/DECISIONS.md entries if new decisions were made -->

## Changelog

- [ ] `CHANGELOG.md` `[Unreleased]` updated
