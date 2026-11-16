# ASG Donations VPS service

`/history?offset=0&limit=50` serves a complete sanitized all-time snapshot,
independent of `DONATIONS_MIN_DATE` and `DONATIONS_LIMIT` used by `/recent`.
Deploy `donation_history.py` and `cbr_rates.py` beside `asg_donations_service.py`, and expose only
the exact `/donations-api/history` nginx location from the supplied snippet.
This is a source preparation; no production installation is implied.

The first request starts a background import. Until it finishes, `complete:false`
is explicit. Large histories resume in bounded workers; partial imports never
replace the previous complete snapshot. A completed snapshot refreshes every ten
minutes on demand. `revision` pins subsequent list pages; HTTP 409 requires
restarting pagination. A failed refresh retains the last complete snapshot.
Ranks sum normalized DonationAlerts nicknames in RUB and exclude anonymous names.
Each foreign donation uses the archived CBR quote effective on its Moscow date,
before fees, dividing the official Value by Nominal. Each converted donation is
rounded half up to kopeks before aggregation. Original currency/amount and quote
date/rate remain visible. Daily quotes persist in the existing state store;
there is no current-rate fallback. Missing or unsupported quotes keep the full
snapshot unpublished, preserving the previous complete result. Conversion also
resumes in bounded background workers.
Public responses contain sanitized fields
only, with no OAuth or payment-provider account data.

Low-resource standard-library Python replacement for the Cloudflare Donations Worker.

The service binds only to `127.0.0.1:8120`, stores OAuth state, tokens and the recent
response cache in `/var/lib/asg-donations/state.sqlite3`, and is exposed by nginx under
`https://data.asgracing.ru/donations-api/`.

Public endpoints:

- `GET /health`
- `GET /recent`
- `GET /history?offset=0&limit=50`
- `GET /oauth/callback`

`/oauth/start` and `/oauth/status` accept direct loopback requests only. nginx must not
expose them. This prevents an external user from replacing the connected DonationAlerts
account.

Install `asg-donations-rate-limit.conf` under `/etc/nginx/conf.d/` and include
`asg-donations.nginx.conf` inside the TLS `server` block for `data.asgracing.ru`.
Run OAuth administration through an SSH tunnel to `127.0.0.1:8120`.

Run the self-contained test suite with:

```bash
python3 -m unittest -v test_asg_donations_service.py
```

The production cutover must keep the old Worker available until `/health`, `/recent`,
OAuth authorization and the home-page widget have all been verified through nginx.
