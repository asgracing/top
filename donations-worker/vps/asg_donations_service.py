#!/usr/bin/env python3
"""Small DonationAlerts API bridge for the ASG Racing VPS."""

from __future__ import annotations

import hashlib
import hmac
import html
import json
import logging
import os
import secrets
import sqlite3
import threading
import time
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen


TOKEN_KEY = "donationalerts:oauth-tokens"
RECENT_CACHE_KEY = "donationalerts:recent-cache"
OAUTH_STATE_KEY = "donationalerts:oauth-state"
TOKEN_URL = "https://www.donationalerts.com/oauth/token"
AUTHORIZE_URL = "https://www.donationalerts.com/oauth/authorize"
DONATIONS_URL = "https://www.donationalerts.com/api/v1/alerts/donations"
GOAL_URL = "https://www.donationalerts.com/api/v1/donationgoal"
WIDGET_TOKEN_URL = "https://www.donationalerts.com/api/v1/token/widget"
MAX_UPSTREAM_BYTES = 4 * 1024 * 1024
MAX_REQUEST_TARGET_LENGTH = 4096
MAX_OAUTH_CODE_LENGTH = 2048
MAX_OAUTH_STATE_LENGTH = 256

LOGGER = logging.getLogger("asg-donations")


class UpstreamError(RuntimeError):
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def clean_text(value: Any, max_length: int = 240) -> str:
    text = " ".join(str(value if value is not None else "").split())
    return "".join(character for character in text if character >= " " and character != "\x7f")[:max_length]


def clean_amount(value: Any) -> float | int | None:
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None
    if amount != amount or amount in (float("inf"), float("-inf")):
        return None
    return int(amount) if amount.is_integer() else amount


def sanitize_donation(item: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": clean_text(item.get("id"), 64),
        "username": clean_text(item.get("username") or "Anonymous", 80) or "Anonymous",
        "message": clean_text(item.get("message"), 600),
        "amount": clean_amount(item.get("amount")),
        "currency": clean_text(item.get("currency"), 8).upper(),
        "created_at": clean_text(item.get("created_at"), 32),
    }


def normalize_goal_payload(data: Any) -> Mapping[str, Any] | None:
    if isinstance(data, Mapping):
        raw = data.get("data", data.get("goal", data))
    else:
        return None
    if isinstance(raw, list):
        active = next((item for item in raw if isinstance(item, Mapping) and int(item.get("is_active") or 0) == 1), None)
        raw = active or next((item for item in raw if isinstance(item, Mapping)), None)
    return raw if isinstance(raw, Mapping) else None


def sanitize_goal(goal: Mapping[str, Any] | None) -> dict[str, Any] | None:
    if not goal:
        return None
    raised = clean_amount(goal.get("raised_amount"))
    target = clean_amount(goal.get("goal_amount"))
    active = int(goal.get("is_active") or 0) == 1
    if not active or raised is None or target is None or float(target) <= 0:
        return None
    return {
        "id": clean_text(goal.get("id"), 64),
        "is_active": True,
        "title": clean_text(goal.get("title"), 120),
        "currency": clean_text(goal.get("currency"), 8).upper(),
        "start_amount": clean_amount(goal.get("start_amount")),
        "raised_amount": raised,
        "goal_amount": target,
        "started_at": clean_text(goal.get("started_at"), 32),
        "expires_at": clean_text(goal.get("expires_at"), 32) if goal.get("expires_at") else None,
    }


def parse_timestamp(value: Any) -> float | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


@dataclass(frozen=True)
class Config:
    bind_host: str
    bind_port: int
    state_path: Path
    allowed_origins: tuple[str, ...]
    client_id: str
    client_secret: str
    redirect_uri: str
    scope: str
    widget_token: str
    goal_id: str
    donations_limit: int
    cache_ttl_seconds: int
    min_timestamp: float | None
    oauth_state_ttl_seconds: int
    upstream_timeout_seconds: int

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Config":
        source = os.environ if env is None else env

        def integer(name: str, default: int, minimum: int, maximum: int) -> int:
            try:
                value = int(source.get(name, str(default)))
            except (TypeError, ValueError):
                value = default
            return max(minimum, min(maximum, value))

        min_date = str(source.get("DONATIONS_MIN_DATE", "2026-01-01")).strip()
        min_timestamp = None
        if min_date:
            try:
                min_timestamp = datetime.strptime(min_date, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp()
            except ValueError:
                min_timestamp = None
        origins = tuple(
            item.strip()
            for item in str(
                source.get(
                    "ALLOWED_ORIGINS",
                    "https://asgracing.ru,https://www.asgracing.ru,https://asgracing.github.io",
                )
            ).split(",")
            if item.strip()
        )
        return cls(
            bind_host=str(source.get("BIND_HOST", "127.0.0.1")),
            bind_port=integer("BIND_PORT", 8120, 1024, 65535),
            state_path=Path(source.get("STATE_PATH", "/var/lib/asg-donations/state.sqlite3")),
            allowed_origins=origins,
            client_id=str(source.get("DONATIONALERTS_CLIENT_ID", "18938")).strip(),
            client_secret=str(source.get("DONATIONALERTS_CLIENT_SECRET", "")).strip(),
            redirect_uri=str(
                source.get(
                    "DONATIONALERTS_REDIRECT_URI",
                    "https://data.asgracing.ru/donations-api/oauth/callback",
                )
            ).strip(),
            scope=str(source.get("DONATIONALERTS_SCOPE", "oauth-donation-index oauth-goal-subscribe")).strip(),
            widget_token=str(source.get("DONATIONALERTS_WIDGET_TOKEN", "")).strip(),
            goal_id=str(source.get("DONATIONALERTS_GOAL_ID", "9854518")).strip(),
            donations_limit=integer("DONATIONS_LIMIT", 50, 1, 100),
            cache_ttl_seconds=integer("DONATIONS_CACHE_TTL_SECONDS", 120, 15, 600),
            min_timestamp=min_timestamp,
            oauth_state_ttl_seconds=integer("OAUTH_STATE_TTL_SECONDS", 600, 60, 1800),
            upstream_timeout_seconds=integer("UPSTREAM_TIMEOUT_SECONDS", 10, 2, 30),
        )


class StateStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as connection:
            with connection:
                connection.execute(
                    "CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at REAL NOT NULL)"
                )

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=5)
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA synchronous=NORMAL")
        return connection

    def get(self, key: str) -> Any:
        with closing(self.connect()) as connection:
            row = connection.execute("SELECT value_json FROM state WHERE key = ?", (key,)).fetchone()
        if not row:
            return None
        try:
            return json.loads(row[0])
        except (TypeError, ValueError):
            return None

    def put(self, key: str, value: Any, now: float) -> None:
        encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        with closing(self.connect()) as connection:
            with connection:
                connection.execute(
                    "INSERT INTO state(key, value_json, updated_at) VALUES(?, ?, ?) "
                    "ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at",
                    (key, encoded, now),
                )

    def delete(self, key: str) -> None:
        with closing(self.connect()) as connection:
            with connection:
                connection.execute("DELETE FROM state WHERE key = ?", (key,))


JsonRequester = Callable[[str, str, Mapping[str, str], bytes | None, int], Any]


def request_json(url: str, method: str, headers: Mapping[str, str], body: bytes | None, timeout: int) -> Any:
    request = Request(url, data=body, headers=dict(headers), method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read(MAX_UPSTREAM_BYTES + 1)
    except HTTPError as error:
        raise UpstreamError(f"DonationAlerts returned HTTP {error.code}", error.code) from error
    except (URLError, TimeoutError, OSError) as error:
        raise UpstreamError("DonationAlerts is temporarily unavailable") from error
    if len(raw) > MAX_UPSTREAM_BYTES:
        raise UpstreamError("DonationAlerts response is too large")
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError) as error:
        raise UpstreamError("DonationAlerts returned invalid JSON") from error


class DonationService:
    def __init__(
        self,
        config: Config,
        store: StateStore,
        requester: JsonRequester = request_json,
        clock: Callable[[], float] = time.time,
    ):
        self.config = config
        self.store = store
        self.requester = requester
        self.clock = clock
        self.refresh_lock = threading.RLock()
        self.recent_lock = threading.Lock()

    def require(self, value: str, name: str) -> str:
        if not value:
            raise RuntimeError(f"{name} is not configured")
        return value

    def allowed_origin(self, requested_origin: str | None) -> str | None:
        origin = str(requested_origin or "").strip()
        if origin and origin in self.config.allowed_origins:
            return origin
        return None

    def token_request(self, parameters: Mapping[str, str]) -> dict[str, Any]:
        form = urlencode(
            {
                "client_id": self.require(self.config.client_id, "DONATIONALERTS_CLIENT_ID"),
                "client_secret": self.require(self.config.client_secret, "DONATIONALERTS_CLIENT_SECRET"),
                **parameters,
            }
        ).encode("utf-8")
        data = self.requester(
            TOKEN_URL,
            "POST",
            {"content-type": "application/x-www-form-urlencoded", "accept": "application/json"},
            form,
            self.config.upstream_timeout_seconds,
        )
        if not isinstance(data, Mapping) or not data.get("access_token"):
            raise UpstreamError("DonationAlerts token response is incomplete")
        return dict(data)

    def write_tokens(self, tokens: Mapping[str, Any], previous_refresh_token: str = "") -> dict[str, Any]:
        expires_in = clean_amount(tokens.get("expires_in")) or 0
        now = self.clock()
        payload = {
            "token_type": clean_text(tokens.get("token_type") or "Bearer", 32),
            "access_token": str(tokens.get("access_token") or ""),
            "refresh_token": str(tokens.get("refresh_token") or previous_refresh_token),
            "expires_in": expires_in,
            "updated_at": datetime.fromtimestamp(now, timezone.utc).isoformat().replace("+00:00", "Z"),
            "expires_at": now + max(0, float(expires_in) - 60) if float(expires_in) > 0 else None,
        }
        if not payload["access_token"] or not payload["refresh_token"]:
            raise UpstreamError("DonationAlerts token response is incomplete")
        self.store.put(TOKEN_KEY, payload, now)
        self.store.delete(RECENT_CACHE_KEY)
        return payload

    def refresh_tokens(self, tokens: Mapping[str, Any]) -> dict[str, Any]:
        with self.refresh_lock:
            latest = self.store.get(TOKEN_KEY)
            now = self.clock()
            if isinstance(latest, Mapping) and latest.get("expires_at") and float(latest["expires_at"]) > now:
                return dict(latest)
            refresh_token = str((latest or tokens).get("refresh_token") or "")
            data = self.token_request({"grant_type": "refresh_token", "refresh_token": refresh_token})
            return self.write_tokens(data, refresh_token)

    def usable_tokens(self) -> dict[str, Any] | None:
        tokens = self.store.get(TOKEN_KEY)
        if not isinstance(tokens, Mapping) or not tokens.get("access_token") or not tokens.get("refresh_token"):
            return None
        if tokens.get("expires_at") and float(tokens["expires_at"]) <= self.clock():
            return self.refresh_tokens(tokens)
        return dict(tokens)

    def authenticated_get(self, url: str, tokens: Mapping[str, Any], retry: bool = True) -> tuple[Any, dict[str, Any]]:
        try:
            data = self.requester(
                url,
                "GET",
                {"authorization": f"Bearer {tokens['access_token']}", "accept": "application/json"},
                None,
                self.config.upstream_timeout_seconds,
            )
            return data, dict(tokens)
        except UpstreamError as error:
            if error.status != 401 or not retry:
                raise
            refreshed = self.refresh_tokens(tokens)
            return self.authenticated_get(url, refreshed, retry=False)

    def donations(self, tokens: Mapping[str, Any]) -> tuple[list[Mapping[str, Any]], dict[str, Any]]:
        items: list[Mapping[str, Any]] = []
        current_tokens = dict(tokens)
        for page in range(1, 11):
            data, current_tokens = self.authenticated_get(f"{DONATIONS_URL}?{urlencode({'page': page})}", current_tokens)
            page_items = data.get("data", []) if isinstance(data, Mapping) else []
            if not isinstance(page_items, list):
                page_items = []
            valid_items = [item for item in page_items if isinstance(item, Mapping)]
            filtered = []
            for item in valid_items:
                timestamp = parse_timestamp(item.get("created_at"))
                if self.config.min_timestamp is None or (timestamp is not None and timestamp >= self.config.min_timestamp):
                    filtered.append(item)
            items.extend(filtered)
            next_page = data.get("links", {}).get("next") if isinstance(data, Mapping) and isinstance(data.get("links"), Mapping) else None
            if not next_page or not valid_items or (valid_items and not filtered):
                break
            if len(items) >= self.config.donations_limit:
                break
        return items[: self.config.donations_limit], current_tokens

    def oauth_goal(self, tokens: Mapping[str, Any]) -> dict[str, Any] | None:
        try:
            data, _ = self.authenticated_get(f"{GOAL_URL}?is_active=1&include_timestamps=1", tokens)
            return sanitize_goal(normalize_goal_payload(data))
        except UpstreamError:
            return None

    def widget_goal(self) -> dict[str, Any] | None:
        if not self.config.widget_token or not self.config.goal_id:
            return None
        token_data = self.requester(
            f"{WIDGET_TOKEN_URL}?{urlencode({'token': self.config.widget_token})}",
            "GET",
            {"accept": "application/json"},
            None,
            self.config.upstream_timeout_seconds,
        )
        widget_api_token = token_data.get("data", {}).get("token") if isinstance(token_data, Mapping) and isinstance(token_data.get("data"), Mapping) else None
        if not widget_api_token:
            raise UpstreamError("DonationAlerts widget token response is incomplete")
        data = self.requester(
            f"{GOAL_URL}/{self.config.goal_id}?include_timestamps=1",
            "GET",
            {"authorization": f"Bearer {widget_api_token}", "accept": "application/json"},
            None,
            self.config.upstream_timeout_seconds,
        )
        return sanitize_goal(normalize_goal_payload(data))

    def goal(self, tokens: Mapping[str, Any] | None) -> dict[str, Any] | None:
        if tokens:
            result = self.oauth_goal(tokens)
            if result:
                return result
        try:
            return self.widget_goal()
        except UpstreamError:
            return None

    def recent(self) -> dict[str, Any]:
        cache = self.store.get(RECENT_CACHE_KEY)
        now = self.clock()
        if isinstance(cache, Mapping):
            cached_at = parse_timestamp(cache.get("cached_at"))
            if cached_at is not None and now - cached_at < self.config.cache_ttl_seconds:
                return {"ok": True, **dict(cache)}

        with self.recent_lock:
            cache = self.store.get(RECENT_CACHE_KEY)
            if isinstance(cache, Mapping):
                cached_at = parse_timestamp(cache.get("cached_at"))
                if cached_at is not None and now - cached_at < self.config.cache_ttl_seconds:
                    return {"ok": True, **dict(cache)}
            cached_goal = cache.get("goal") if isinstance(cache, Mapping) else None
            try:
                tokens = self.usable_tokens()
                current_goal = self.goal(tokens) or cached_goal
                if not tokens:
                    fallback = dict(cache) if isinstance(cache, Mapping) else {
                        "items": [],
                        "cached_at": datetime.fromtimestamp(now, timezone.utc).isoformat().replace("+00:00", "Z"),
                    }
                    return {
                        "ok": True,
                        "stale": True,
                        **fallback,
                        "goal": current_goal,
                        "warning": "DonationAlerts OAuth is not connected yet.",
                    }
                donations, tokens = self.donations(tokens)
                current_goal = self.goal(tokens) or current_goal
                payload = {
                    "items": [sanitize_donation(item) for item in donations],
                    "goal": current_goal,
                    "cached_at": datetime.fromtimestamp(now, timezone.utc).isoformat().replace("+00:00", "Z"),
                }
                self.store.put(RECENT_CACHE_KEY, payload, now)
                return {"ok": True, **payload}
            except (RuntimeError, UpstreamError):
                LOGGER.warning("DonationAlerts refresh failed; serving the most recent safe cache", exc_info=True)
                fallback = dict(cache) if isinstance(cache, Mapping) else {
                    "items": [],
                    "goal": cached_goal,
                    "cached_at": datetime.fromtimestamp(now, timezone.utc).isoformat().replace("+00:00", "Z"),
                }
                return {
                    "ok": True,
                    "stale": True,
                    **fallback,
                    "warning": "DonationAlerts is temporarily unavailable.",
                }

    def oauth_start_url(self) -> str:
        state = secrets.token_urlsafe(32)
        now = self.clock()
        self.store.put(
            OAUTH_STATE_KEY,
            {
                "digest": hashlib.sha256(state.encode("utf-8")).hexdigest(),
                "expires_at": now + self.config.oauth_state_ttl_seconds,
            },
            now,
        )
        return f"{AUTHORIZE_URL}?{urlencode({'client_id': self.require(self.config.client_id, 'DONATIONALERTS_CLIENT_ID'), 'redirect_uri': self.require(self.config.redirect_uri, 'DONATIONALERTS_REDIRECT_URI'), 'response_type': 'code', 'scope': self.require(self.config.scope, 'DONATIONALERTS_SCOPE'), 'state': state})}"

    def oauth_callback(self, code: str, state: str) -> None:
        stored = self.store.get(OAUTH_STATE_KEY)
        digest = hashlib.sha256(state.encode("utf-8")).hexdigest()
        if not isinstance(stored, Mapping) or float(stored.get("expires_at") or 0) < self.clock() or not hmac.compare_digest(str(stored.get("digest") or ""), digest):
            raise ValueError("Invalid or expired OAuth state")
        self.store.delete(OAUTH_STATE_KEY)
        tokens = self.token_request(
            {
                "grant_type": "authorization_code",
                "redirect_uri": self.require(self.config.redirect_uri, "DONATIONALERTS_REDIRECT_URI"),
                "code": code,
            }
        )
        self.write_tokens(tokens)


class Handler(BaseHTTPRequestHandler):
    server_version = "ASGDonations"
    sys_version = ""

    @property
    def service(self) -> DonationService:
        return self.server.service  # type: ignore[attr-defined]

    def log_message(self, _format: str, *_args: Any) -> None:
        return

    def cors_headers(self) -> dict[str, str]:
        headers = {
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
            "Vary": "Origin",
        }
        allowed_origin = self.service.allowed_origin(self.headers.get("Origin"))
        if allowed_origin:
            headers["Access-Control-Allow-Origin"] = allowed_origin
        return headers

    def send_bytes(self, status: int, body: bytes, content_type: str, extra_headers: Mapping[str, str] | None = None) -> None:
        self.send_response(status)
        headers = {**self.cors_headers(), **dict(extra_headers or {})}
        headers["Content-Type"] = content_type
        headers["Content-Length"] = str(len(body))
        for key, value in headers.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, payload: Mapping[str, Any], status: int = 200, cache_control: str | None = None) -> None:
        headers = {"Cache-Control": cache_control} if cache_control else {}
        self.send_bytes(status, json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), "application/json; charset=utf-8", headers)

    def send_html(self, markup: str, status: int = 200) -> None:
        self.send_bytes(status, markup.encode("utf-8"), "text/html; charset=utf-8")

    def is_direct_request(self) -> bool:
        return self.client_address[0] in {"127.0.0.1", "::1"} and not self.headers.get("X-Forwarded-For")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_bytes(204, b"", "text/plain; charset=utf-8")

    def do_GET(self) -> None:  # noqa: N802
        if len(self.path) > MAX_REQUEST_TARGET_LENGTH:
            self.send_json({"ok": False, "error": "Request target is too long"}, 414)
            return
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/health":
                self.send_json({"ok": True})
                return
            if parsed.path == "/recent":
                self.send_json(self.service.recent(), cache_control="public, max-age=60")
                return
            if parsed.path == "/oauth/start":
                if not self.is_direct_request():
                    self.send_json({"ok": False, "error": "Not found"}, 404)
                    return
                self.send_response(302)
                self.send_header("Location", self.service.oauth_start_url())
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if parsed.path == "/oauth/status":
                if not self.is_direct_request():
                    self.send_json({"ok": False, "error": "Not found"}, 404)
                    return
                self.send_json(
                    {
                        "ok": True,
                        "oauth_connected": bool(self.service.store.get(TOKEN_KEY)),
                        "cache_present": bool(self.service.store.get(RECENT_CACHE_KEY)),
                    }
                )
                return
            if parsed.path == "/oauth/callback":
                query = parse_qs(parsed.query)
                error = clean_text((query.get("error") or [""])[0], 160)
                if error:
                    self.send_html(f"<h1>DonationAlerts authorization failed</h1><p>{html.escape(error)}</p>", 400)
                    return
                code = str((query.get("code") or [""])[0])[: MAX_OAUTH_CODE_LENGTH + 1]
                state = str((query.get("state") or [""])[0])[: MAX_OAUTH_STATE_LENGTH + 1]
                if not code or not state:
                    self.send_html("<h1>DonationAlerts authorization failed</h1><p>Missing code or state.</p>", 400)
                    return
                if len(code) > MAX_OAUTH_CODE_LENGTH or len(state) > MAX_OAUTH_STATE_LENGTH:
                    self.send_html("<h1>DonationAlerts authorization failed</h1><p>Invalid authorization response.</p>", 400)
                    return
                try:
                    self.service.oauth_callback(code, state)
                except (RuntimeError, UpstreamError, ValueError):
                    self.send_html("<h1>DonationAlerts authorization failed</h1><p>Invalid, expired, or rejected authorization.</p>", 400)
                    return
                self.send_html("<h1>DonationAlerts connected</h1><p>You can close this tab.</p>")
                return
            self.send_json({"ok": False, "error": "Not found"}, 404)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception:
            LOGGER.exception("Unhandled request failure for path %s", parsed.path)
            self.send_json({"ok": False, "error": "Internal server error"}, 500)

    def method_not_allowed(self) -> None:
        self.send_json({"ok": False, "error": "Method not allowed"}, 405)

    do_POST = method_not_allowed
    do_PUT = method_not_allowed
    do_PATCH = method_not_allowed
    do_DELETE = method_not_allowed


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], service: DonationService):
        super().__init__(address, Handler)
        self.service = service


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    config = Config.from_env()
    service = DonationService(config, StateStore(config.state_path))
    server = Server((config.bind_host, config.bind_port), service)
    print(f"ASG Donations listening on {config.bind_host}:{config.bind_port}", flush=True)
    server.serve_forever(poll_interval=0.5)


if __name__ == "__main__":
    main()
