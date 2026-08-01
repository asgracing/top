# Clubs/Teams frontend handoff — Stage F4b3b

Stage F4b3b completes the browser-side team-to-club affiliation workflow without
changing production.

## Implemented

- Public club/team detail pages expose an affiliation CTA using only the public
  entity identifier and display name.
- The account page allows a team captain to request affiliation and a club head
  to invite a team.
- Pending request/invitation cards show both public parties and expiry. Only the
  authorized manager receives accept/reject controls.
- Detachment is available only to the club head or the captain of the affected
  team. It requires confirmation and warns that the backend archives the team
  and stops its operations.
- Command builders use exact allowlists. Internal entity/action identifiers stay
  in protected snapshot metadata and never enter URLs or rendered receipts.
- Existing CSRF, Origin, recent-auth, immutable-snapshot, bounded-polling and
  safe-receipt guards remain shared with earlier F4b stages.

## Verification

- `npm.cmd run ci`: passed.
- Unit tests: 243/243.
- Build: 261 files.
- Reference verification: 728 references.
- Smoke checks: 25.
- Source module budget: 274877 / 277000 bytes.

The in-app browser returned no available browser backend on 01.08.2026, so the
desktop/tablet/mobile RU/EN visual and keyboard matrix remains an explicit
staging gate.

## Deployment state

No push or production deployment was performed. The next required checkpoint is
Stage 6V: real auth queue → backend apply → refreshed actor-state round-trip,
followed by the manual visual matrix. Backend installation on the primary server
must use the separately prepared delivery package and rollback instructions.
