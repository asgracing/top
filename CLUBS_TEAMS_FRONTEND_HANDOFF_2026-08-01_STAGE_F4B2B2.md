# Clubs/Teams frontend Stage F4b2b2 handoff

Local feature branch only. Production is unchanged.

Implemented manager roster controls:

- immutable public roster loading;
- bounded public pilot-index normalization and search;
- invite for pilots outside the current roster;
- remove only for ordinary members;
- protected manager entity IDs never enter DOM or URLs;
- RU/EN and responsive vertical mobile layout.

Validation:

- frontend CI: 241/241 tests;
- build: 261 files;
- references: 728;
- smoke: 25 routes/assets;
- auth membership validation: 9/9;
- backend membership/bridge/state: 24/24;
- visual matrix pending because no browser backend was available.

Do not deploy this stage alone. Next: team-club actions or staging round-trip,
then a coordinated auth → frontend → backend rollout package.
