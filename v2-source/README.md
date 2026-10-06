# V2 home build inputs

Frozen R24 presentation: `home.html`, combined `design.css`, editorial RU/EN `copy.json`.
These inputs contain no captured live datasets. Runtime branding is tracked in `v2/assets`.

Run `npm run build:v2` to regenerate `v2/{ru,en}/index.html`, `v2/copy.js`,
`v2/styles/design.css`, and the canonical `app.js` adapter in `v2/runtime/home.js`.
Edit `v2/home.js`, `v2/home.css`, and `scripts/v2-runtime-facade.txt` for integration.
Do not edit generated runtime/HTML directly.

V1 remains the primary site. `/v2/` defaults to RU; both new home pages link back to V1.
V2 keeps the existing consent and analytics loader, uses `noindex,follow`, and reads
the current public APIs. Its vote actions call the existing live Hourly client.

`npm run ci` verifies/builds the release. Optional browser checks are
`tests/deployment/check-v2-home.mjs` (bounded fixtures, writes intercepted) and
`tests/deployment/check-v2-live-readonly.mjs` (public GET only, all writes blocked).
They currently require local Windows Chrome/Playwright and a server on port 8840;
set `ASG_V2_PREVIEW` for another local origin. Optional test reports are research artifacts.
