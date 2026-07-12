# Home visual regression matrix

Target: `http://127.0.0.1:5500/top/`.

The authoritative matrix is `home.matrix.json`. Every viewport must be checked in RU and EN for loaded, loading, empty and error states. API-dependent states use `tests/fixtures` and must never depend on changing production data.

Baseline screenshot naming:

`home__<viewport>__<language>__<state>__<section>.png`

Before accepting a baseline:

1. Confirm the Live Server returns HTTP 200.
2. Disable non-deterministic video and attention animations.
3. Freeze API data with fixtures.
4. Capture all sections listed in the matrix.
5. Review layout changes instead of blindly updating screenshots.

The initial rating-table layout was manually accepted by the user on 12.07.2026. Automated captures remain pending until the in-app browser connection is available.
