# Clubs/Teams frontend Stage F4b3a handoff

Contract-only checkpoint; visible UI is unchanged.

The auth model strictly normalizes pending team-club actions, retains only
public team/club metadata and stores action IDs in a private WeakMap. Invalid
actions make the cabinet mutation state fail closed.

Validation: frontend CI 242/242, 261 dist files, 728 references, 25 smoke.
Visual validation is not applicable until F4b3b introduces UI.
