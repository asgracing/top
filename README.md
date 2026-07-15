# ASG Racing leaderboard

Static frontend for the ASG Racing leaderboard and related public pages.

## Verification

```powershell
npm.cmd run verify
```

The command checks JavaScript syntax, structural quality budgets, performance budgets and 195 unit/contract tests.

## Deployment artifact

```powershell
npm.cmd run ci
```

This verifies the source, creates an allowlisted `dist/`, validates its manifest and SHA-256 checksums, checks all local HTML/CSS/JS references and runs an HTTP smoke test from `dist/`. A subsequent build preserves the prior artifact in `dist.previous/` for local rollback.

See [docs/ROLLOUT_AND_ROLLBACK.md](docs/ROLLOUT_AND_ROLLBACK.md) and [docs/REFACTORING_REPORT_2026-07-15.md](docs/REFACTORING_REPORT_2026-07-15.md).
