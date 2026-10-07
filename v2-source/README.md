# V2 home build inputs

**07.10.2026 — release preparation:** maintained V1 HTML now lives in
`v1-source/html`; localized inputs are compiled in memory, not read from public
root HTML. See `v1-source/README.md`. The registry is `v2/page-registry.js`.
Always run a complete `npm run build:v2`: presentation-only mode mentioned in
historical notes below has been retired and now fails explicitly. Runtime and
input hashes are checked; public routes remain unchanged pending the next step.

Frozen R24 presentation: `home.html`, combined `design.css`, editorial RU/EN `copy.json`.
These inputs contain no captured live datasets. Runtime branding is tracked in `v2/assets`.

Run `npm run build:v2` to regenerate `v2/{ru,en}/index.html`, `v2/copy.js`,
`v2/styles/design.css`, and the canonical `app.js` adapter in `v2/runtime/home.js`.
Edit `v2/home.js`, `v2/home.css`, and `scripts/v2-runtime-facade.txt` for integration.
Do not edit generated runtime/HTML directly.

V1 remains the primary site. `/v2/` defaults to RU; both new home pages link back to V1.
V2 keeps the existing consent and analytics loader, uses `noindex,follow`, and reads
the current public APIs. Its vote actions call the existing live Hourly client.

The first additional live routes are `v2/{ru,en}/hourly/` and
`v2/{ru,en}/driver/?id=<public_id>`. Their approved R13–R19 rendering and CSS
are frozen in `v2-source/pages`; the builder emits these into `v2/pages/views`.
The live adapter is `v2/pages/controller.js` and `v2/pages/data.js`. Captured
datasets belong exclusively to `tests/fixtures/v2-pages` and are never emitted.
Other page families still use their working V1 routes until their adapters are ready.

The next migrated routes are `v2/{ru,en}/races/` (archive) and
`v2/{ru,en}/race/?id=<race_id>` (full result sheet), using frozen R20–R22
markup and `site-pages.css`. Initial archive/pagination reads only the required
published storage chunk and displays ten races per UI page. Explicit search or
filters read the published summary chunks with progress, caching and cancellation
of obsolete searches; there is no backend search API. Race details load on demand
from their owning `top-data/v2` or `hourly-data` namespace. ELO follows V1's
published internal-rating fallback; missing data stays unavailable. Result tables
mark the official fastest lap only, distinguish the three podium places, and
highlight the verified signed-in driver. Run `node tests/deployment/check-v2-archive.mjs`
for archive/result routes, filters, paging, rating modals and failure states.
Historic mono events use the car restriction in the published Hourly result's
`slot` when archive summaries omit it. Extra reads are cached, limited to three
at a time and restricted to relevant Hourly rows; cars driven never determine
the event restriction. Monoclass has a separate archive filter and blue badge;
public races use muted neutral grey. Endurance cards retain light text and green
accents. `check-v2-event-colors.mjs` covers cards, calendar, event details, archive
types/filters and standalone results in RU/EN on desktop and mobile.

Use `ASG_V2_PRESENTATION_ONLY=1 node scripts/build-v2.mjs` to regenerate only
presentation files while preserving the existing generated business runtime in a
mixed worktree. A full release build must still regenerate and verify the canonical
runtime. Run `node tests/deployment/check-v2-pages.mjs` against the local server
for the additional routes; all external requests, including votes, are intercepted.
For manual local viewing, run `python scripts/preview-v2.py --port 8840`.
Its localhost-only public GET proxy handles the data CDN's CORS restriction;
the injected fetch shim never appears in generated HTML or production assets.

Championship overview `v2/{ru,en}/championships/` and season detail
`v2/{ru,en}/hourly/championship/?slug=<slug>` retain the approved R20/R24 layout.
The adapter reads the published championship index and season files, standings,
rounds, prizes and the existing championship community-ranking context. The latter
is not season-specific in the current public source and is labelled accordingly.
Standings show ten drivers per page and highlight the verified signed-in driver.
Registration uses the shared Hourly token client and remains open for championships.
Seasonal result sheets retain championship points/classifications; ELO/SR fields
are merged by public driver ID from the corresponding published Hourly result.
Unavailable historic ratings remain blank. Event/results/rating dialogs use the
same V2 components as home and Hourly. History and account routes still open V1.
`node tests/deployment/check-v2-championships.mjs` checks both languages, five
viewport widths, filtering, paging, auth highlights, intercepted registration,
shared dialogs, prizes, scheduled/missing seasons and network errors. The local
preview also proxies public prize images through its injected development shim;
the published presentation uses their original public URLs.

Club/team catalog `v2/{ru,en}/teams/`, club detail `v2/{ru,en}/clubs/?slug=<slug>`
and team detail `v2/{ru,en}/teams/detail/?slug=<slug>` preserve the approved R20
markup. Existing public models validate the snapshot pointer, rating pages,
entity details and snapshot-bound logos. General, Hourly and championship contexts
use their published rankings; tabs, context and search survive language changes.
Details show actual rosters, roles, related entities and ten recent races per page.
Verified signed-in drivers are highlighted; ELO/SR and race dialogs reuse V2.
Membership and club/team affiliation actions pass the actual public entity ID and
name to the existing V1 account page. No membership action is simulated locally.
Entity links from home, profiles, Hourly and championship pages now stay in V2.
Run `node tests/deployment/check-v2-entities.mjs` for RU/EN layouts, contexts,
search, shared dialogs, pagination, auth highlights and empty/error states.
The local development image shim also proxies public entity logos.

Cars `v2/{ru,en}/cars/` retains the approved full-width R24 layout: selected
model, ten-row catalog and two-model comparison. The adapter reads the existing
`top-data/v2/cars/cars.json`; captured examples remain test-only. Search, brand,
sorting, paging and model selection update their own blocks without rereading
the catalog. The existing car model and shared table sorter own sorting; missing
values stay unavailable and sort after published values. Selected model and
catalog controls survive reload/language changes through the URL. Best-lap
authors link to V2 profiles; unprovided car icons are hidden gracefully.
Run `node tests/deployment/check-v2-cars.mjs` for RU/EN, five viewport widths,
all sorts, filters, comparison, links and empty/missing/offline states.

The car catalog now has a best-lap circuit selector after manufacturer. The
published track index supplies the options; `tables/bestlaps-{track}.json`
supplies each driver's personal best. `cars-laps-model.js` groups these records
by model, selects the fastest valid lap and retains its actual author. This is
explicitly labelled as a record among published personal bests: the source is
not a complete model-by-circuit lap database. Global model metrics are retained.
No circuit is preloaded before selection; a `track` URL loads that circuit.
Sorting uses the selected circuit's times and puts absent records last.
Changing circuits cancels the old request and clears old times. Errors expose
retry; only four compact model-record maps are cached, not the large rankings.
URL/reload/language/model links preserve the selected circuit. Checks include
both languages at 320–1920 px, cache reuse, retry and delayed-response races;
15 car/unit checks and a public GET-only Imola smoke passed. Local only.

Fun statistics `v2/{ru,en}/fun-stats/` preserves the full-width R24 award and
leader-list layout. It reads complete published week/month summaries from
`top-data/v2/fun-stats.json`; it never recomputes totals from archive excerpts.
The selected period updates only its content and survives reload/language
changes. Driver and popular-car links stay in V2; missing periods and sparse
lists remain explicit. Dates use the shared Moscow-time parser.

Bans `v2/{ru,en}/bans/` keeps R20's overview layout with side widgets, search
and ten rows per page. The owning public `top-data/bans.json` provides names
and dates only. The driver index loads once after the list is visible; only
explicit public IDs or unique currently banned matches become profile links.
Duplicate/missing names remain plain text rather than fabricated profiles.
Index failure keeps the ban list usable. Only resolved ban records are retained,
without the index's unrelated histories. Search/page survive language changes.
Run `node tests/deployment/check-v2-fun-bans.mjs` and
`node --test tests/unit/v2-bans-model.test.mjs` for responsive RU/EN layouts,
published totals, period/page/search controls, identity resolution and failures.
The fixture is a bounded public snapshot, never a production fallback.

Championship history `v2/{ru,en}/hourly/championship/history/` retains R20's
season-card grid with the existing search/status actions. Actual published
details exclude the current announcement's season (as V1 does). Search/status
survive reload/language; season links stay in V2. Completed badges are gray,
scheduled badges yellow.

News `v2/{ru,en}/news/` and articles `v2/{ru,en}/news/article/?slug=<slug>`
retain R20's feed and wide reader. `/news/?slug=…` is a compatible alias.
The owning `/news-content/news.json` provides text and assets; publication,
expiry, pinning and priority use the shared news model. Explicit RU/EN fields,
objects and legacy body markers are supported. Filters/six-card pages update
only their content. Read-state keys and the native notification controller
are shared with V1; notification links now open V2 articles. Missing/expired
articles use the approved 404 state. URL policy rejects unsafe links/images.

Community `v2/{ru,en}/community/` reads the owning `/community/posts.js`.
R20's posts/sidebar, three-post pages and photo dialogs retain actual RU/EN
paragraphs, lists and images. The existing worker's one-way GET `/likes` /
POST `/like` contract and `communityLikeVoterId` TTL remain intact. Requests
update only reaction controls; errors never fabricate success. The worker
allows the main domain rather than localhost. The local helper proxies only
the fixed public GET endpoint and disables submission with a preview label;
its shim/flag is never emitted for publication. Writes are tested only on
intercepted responses. Run `node tests/deployment/check-v2-editorial.mjs` and
`node --test tests/unit/v2-editorial.test.mjs`. Optional environment variable
`ASG_V2_EDITORIAL_STAGE=layouts|interactions|states` selects a check group.
Verified RU/EN at 320–1920 px, filters/paging, real read-state, transitions,
reactions/photo dialogs and sparse/failed/missing states.

The eighth local batch ports R20 instructions/document readers and R24 about/
missing screens: `v2/{ru,en}/about/`, `instructions/`, `join/`, `documents/`,
`documents/read/?id=privacy|cookies`, `privacy/`, `cookies/`, and `404/`.
`scripts/v2-information-content.mjs` compiles the maintained V1 RU/EN guide HTML
and original legal HTML into `v2/pages/information-content.js`. It never reads
research snapshots. Every source section, update date, original Russian text
and English note is preserved. The English reader explains the original text's
language; it does not invent an approved translation. Documents use the approved
wide reader/TOC; overview pages retain widgets and shared reference dialogs.
Nav/footer, related documents, consent links, reader anchors, and language
transitions stay in V2. Consent storage/loading remains the existing legal.js.

Missing driver/race/championship/club/team/article/car/guide/document records
share the R24 error component. Service outages have a separate retry state.
The existing root `404.html` redirects only unknown V2 paths to the localized
V2 error view, preserving the missing path. Local preview emulates the existing
static host's 404 fallback. HTTP error handling in production still depends on
the host serving root 404.html; this batch does not configure nginx or deploy.
Checks: `node --test tests/unit/v2-information.test.mjs` and
`node tests/deployment/check-v2-information.mjs`, with optional
`ASG_V2_INFORMATION_STAGE=layouts|interactions|states` and comma-separated
`ASG_V2_INFORMATION_SCREEN=privacy,cookies`. External writes are blocked.
The full layout pass covered seven screens in RU/EN at 320–1920 px; reader
navigation, language/hash preservation, reference/consent dialogs, nine missing
entity types and outages were also checked. No commit/publication occurred.

The ninth local batch adds `v2/{ru,en}/account/` using R21's wide account grid,
four summaries, memberships/requests, operations and driver widget. The
presentation adapter mounts the existing account controller with normalized
Steam session data; it preserves command contracts, CSRF, queue states, roles,
reauthentication, uploads, roster tools and widget actions. Confirmations use
the shared V2 dialog. Auth refresh preserves active workspaces. Approved public
club/team metadata uses the existing identity-checked loader. No prototype
identities, permission switches or simulated writes are included in runtime.
Guest, unlinked, unavailable, stale and disabled data retain explicit states.
Settings/administration/Lab still use the existing V1 routes and permissions.
V2 navigation now opens the new account in the selected language.

Run `node tests/deployment/check-v2-account.mjs`: RU/EN at 320–1920 px,
ten access/data states, intercepted create/error responses, cancellation,
workspace preservation and V1 account regression. External writes are blocked.
The existing auth/command/widget unit tests and Hourly/profile/shared-dialog
regression also passed. This batch remains local, without publication.

Use `ASG_V2_PRESENTATION_ONLY=1` while reviewing presentation over the frozen
runtime. This avoids importing unrelated pending canonical controller work.
Full release validation/runtime regeneration must include that work's review;
the canonical-source hash check intentionally rejects a stale runtime.

The homepage's driver-of-the-day name now opens daily results from the existing
bridge `day` object instead of the career profile dialog. It shows the source
date in Moscow time, daily points/races/wins/podiums, average finish/position
change, and the day's purple best lap with track/car/session. Profile navigation
is separate; the card's ELO/SR buttons retain their existing history dialogs.
The open dialog refreshes from changed bridge data without polling or additional
profile requests. Missing values stay unavailable and actual zero values stay
zero. `node tests/deployment/check-v2-driver-day.mjs` checks RU/EN at 320–1920 px,
daily-vs-career values, empty/partial updates, signed deltas, profile links,
ELO/SR and keyboard focus. This change remains local, without publication.

The winner card's “Recent races” button opens Hourly's published recent list,
using the same `createPageViews().recent()` renderer and five-race pagination.
Race rows open the shared `paintRace()` protocol, retaining linked profiles,
ELO/SR histories, podium colors and the official purple fastest lap. Closing
results restores the parent list's page, scroll and focused row; rating history
also returns to the protocol. The modal stack invalidates pending child loads
on return. The complete archive remains linked inside the list. Nothing is
polled or written by this feature. `check-v2-recent-races.mjs` checks RU/EN at
320–1920 px, keyboard/focus, list → protocol → SR → return, pagination, empty
data, retries and late responses. Existing daily-statistics and Hourly/profile
checks passed too. A GET-only local smoke check loaded the currently published
recent list and the latest Monza protocol (42 drivers) without browser errors.
This change remains local, without publication.

The upcoming home card now includes “Calendar”. It opens the same published
Hourly calendar renderer, month controls, four event colors and completed race
links. Selecting a scheduled event opens the common home/Hourly event modal
with sessions, full pitstop rules, weather and privacy disclosure. Current
announcement participation uses the native home action/state, keeping the hero
and modal synchronized; other dates use the existing token-based votes client.
Team entries retain their existing registration link. Championship registration
uses the existing Hourly normalization that keeps it open. Closing event details
or results restores the calendar month and focused day. Actual dialog closure
also releases the shell and restores focus, including browser-initiated closure.
`check-v2-home-calendar.mjs` covers RU/EN at 320–1920 px, all seven mobile weekdays,
header bounds, nested navigation, vote/unvote, pending states, counts, failure
retries and home synchronization. All writes in browser tests are intercepted.
The recent-races regression passed; a public GET-only smoke check loaded October's
25 scheduled events and Suzuka details without browser errors. Local only.

The approved R21/R22 settings, moderation and Portal Operations compositions are
now migrated to `v2/{ru,en}/account/settings/`, `moderation/` and `portal-ops/`.
`v2/pages/control.js` arranges the existing controller nodes into the prototype
grids; `control.css` adapts them to the shared control-page styles. The builder
compiles only the canonical moderation/Portal form markup into `control-content.js`.
Account/settings, moderation and Portal controllers expose mount/update entry
points, while V1 keeps its standalone initialization. V2's shared Steam header
owns identity; actual `moderationIssue`/`portalManage` permissions gate the pages.
CSRF, protected pilots, two confirmations for a third strike, number eligibility,
idempotency keys, entity versions, schedule revisions and verified preview tokens
retain their existing API contracts. No mock roles or commands are shipped.
The operation log uses selected-entity audit data and current-session responses;
it does not pretend to load a global journal that the current APIs do not expose.
The personal driver-widget manager reuses existing actions. ASG Lab remains V1
and its deferred subscription/account features are unchanged.

`check-v2-control.mjs` checks RU/EN at 320–1920 px, access/availability states,
confirm/cancel, profile title/race number, number approval, protected drivers,
sanctions, third-strike confirmation, permission loss, Hourly preview/apply,
championship locks, clubs/team review, CSRF and revisions. Every write is mocked.
The old account and moderation browser regressions, 362 unit tests and SEO
checks passed. Shared module size budgets were increased modestly for the mount
bridges and localization; private controllers are loaded only for their own screen.
No new idle polling or background animation was added. Local only, no publication.

For this local migration use `ASG_V2_PRESENTATION_ONLY=1` when running the builder:
the canonical `app.js` has unrelated pending changes, and the existing V2 runtime
is intentionally frozen. The complete `verify` currently stops at the pre-existing
canonical-runtime hash mismatch; the unit, syntax, SEO, performance and relevant
browser checks are run separately. Resolve that runtime release decision before
publishing these pages.

`npm run ci` verifies/builds the release. Optional browser checks are
`tests/deployment/check-v2-home.mjs` (bounded fixtures, writes intercepted) and
`tests/deployment/check-v2-live-readonly.mjs` (public GET only, all writes blocked).
They currently require local Windows Chrome/Playwright and a server on port 8840;
set `ASG_V2_PREVIEW` for another local origin. Optional test reports are research artifacts.
