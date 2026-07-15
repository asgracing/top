## What changed

- Completed the `/top` home and shared frontend refactor roadmap R00–R16.
- Added tested data/runtime boundaries, route features, shared table and modal infrastructure.
- Consolidated responsive UI, accessibility and localization safeguards.
- Added performance budgets and a verified immutable deployment artifact pipeline.

## Why

The production snapshot had monolithic JS/CSS, duplicated component rules, fragile modal/layout behavior and no reproducible deployment artifact. The refactor reduces regression risk and makes future table, UI and data changes testable.

## Validation

- [ ] `npm run ci`
- [ ] GitHub Actions quality workflow
- [ ] Candidate `dist` artifact reviewed
- [ ] Desktop RU/EN smoke
- [ ] Mobile RU/EN smoke
- [ ] Data, tabs, sorting, pagination and filters
- [ ] Modal close/focus and inner controls
- [ ] Production canary smoke

## Rollout

Follow `docs/ROLLOUT_AND_ROLLBACK.md`. Keep the previous immutable artifact available throughout the observation window.
