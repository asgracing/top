# Rollout and rollback

## Pre-merge gate

1. Run `npm.cmd run ci` from the repository root.
2. Confirm 195/195 tests and green quality, performance, dist, reference and HTTP smoke gates.
3. Review the GitHub Actions `top-dist-<commit>` artifact instead of deploying the source checkout.
4. Perform the manual visual checklist below on the candidate artifact.
5. Merge only with a known-good production artifact retained for rollback.

## Manual visual and interaction smoke

Test RU and EN at minimum at 1440×900 and 414×896; include 1920×1080, 1366×768, 1024×768, 768×1024 and 360×800 when accepting the final visual baseline.

- Home data leaves loading state and server totals are populated.
- Hero order is title → driver of the day → today stats → four mini-stat cards → online chart → support → hourly event.
- Four mini-stat cards are equal rectangles on desktop and one item per row on mobile.
- Rating, Best Laps and Safety tabs switch by pointer and keyboard.
- Search, sorting, pagination and track filters work.
- Driver preview opens; SR/ELO badges and both track selectors remain interactive.
- Every modal closes by button, overlay and Escape and restores focus.
- Server sticky cards show track backgrounds and open the player dialog.
- No horizontal page overflow, overlapping controls or blocked floating widgets.
- Races, Driver, Cars, Fun Stats, Community, News and Bans routes load without console errors.

## Rollout

1. Deploy the immutable CI artifact for the merge commit.
2. Smoke `/top/` and the seven child routes against production.
3. Confirm API data, video range requests and critical modal/table interactions.
4. Observe frontend/API errors for at least 30 minutes before declaring rollout stable.
5. Retain the previous artifact through the next normal release.

## Rollback triggers

Rollback immediately for persistent empty production data, JavaScript initialization failure, unusable navigation/modals, broken mobile hero flow, missing critical assets or a material increase in frontend errors.

## Rollback procedure

1. Redeploy the previous immutable GitHub Actions artifact or the locally preserved `dist.previous/` created before the candidate build.
2. Purge only HTML cache if required; content-versioned media paths can remain cached.
3. Verify `/top/`, Rating data, one child route and one modal interaction.
4. Record the failed revision from `build-meta.json` and investigate on a new fix branch; do not patch production files manually.
