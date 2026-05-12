# ASG Racing Donations Worker

Cloudflare Worker for a safe DonationAlerts recent supporters widget.

It keeps DonationAlerts OAuth tokens out of the public site, fetches recent
donations from the DonationAlerts API, and returns a sanitized JSON feed for
`/top`.

## Endpoints

- `GET /oauth/start` - starts DonationAlerts authorization.
- `GET /oauth/callback` - receives the OAuth code and stores tokens in KV.
- `GET /recent` - public sanitized recent donations feed.
- `GET /health` - simple health check.

## Cloudflare setup

From this directory:

```bash
wrangler kv namespace create DONATION_ALERTS_KV
```

Copy the generated `id` into `wrangler.toml`.

Then add secrets:

```bash
wrangler secret put DONATIONALERTS_CLIENT_SECRET
wrangler secret put OAUTH_STATE
```

Use any long random string for `OAUTH_STATE`.

## Deploy

```bash
wrangler deploy
```

Then open:

```text
https://donations.asgracing.workers.dev/oauth/start
```

Authorize the app in DonationAlerts. After the callback succeeds, the public
feed should work:

```text
https://donations.asgracing.workers.dev/recent
```

## Notes

DonationAlerts docs:

- OAuth authorization code flow uses `/oauth/authorize` and `/oauth/token`.
- Viewing donations requires the `oauth-donation-index` scope.
- Donation list endpoint is `/api/v1/alerts/donations`.

