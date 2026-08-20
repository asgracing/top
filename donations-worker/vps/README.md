# ASG Donations VPS service

Low-resource standard-library Python replacement for the Cloudflare Donations Worker.

The service binds only to `127.0.0.1:8120`, stores OAuth state, tokens and the recent
response cache in `/var/lib/asg-donations/state.sqlite3`, and is exposed by nginx under
`https://data.asgracing.ru/donations-api/`.

Public endpoints:

- `GET /health`
- `GET /recent`
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
