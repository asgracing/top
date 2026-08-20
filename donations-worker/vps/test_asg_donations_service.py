from __future__ import annotations

import http.client
import tempfile
import threading
import unittest
from pathlib import Path

import asg_donations_service as module


def make_config(state_path: Path) -> module.Config:
    return module.Config.from_env(
        {
            "BIND_HOST": "127.0.0.1",
            "BIND_PORT": "8120",
            "STATE_PATH": str(state_path),
            "ALLOWED_ORIGINS": "https://asgracing.ru,https://www.asgracing.ru",
            "DONATIONALERTS_CLIENT_ID": "client-id",
            "DONATIONALERTS_CLIENT_SECRET": "client-secret",
            "DONATIONALERTS_REDIRECT_URI": "https://data.asgracing.ru/donations-api/oauth/callback",
            "DONATIONALERTS_SCOPE": "oauth-donation-index",
            "DONATIONS_MIN_DATE": "2026-01-01",
        }
    )


class DonationServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        state_path = Path(self.temp_dir.name) / "state.sqlite3"
        self.config = make_config(state_path)
        self.store = module.StateStore(state_path)

    def test_unknown_origin_is_not_granted_cors(self) -> None:
        service = module.DonationService(self.config, self.store)
        self.assertEqual(service.allowed_origin("https://asgracing.ru"), "https://asgracing.ru")
        self.assertIsNone(service.allowed_origin("https://evil.example"))
        self.assertIsNone(service.allowed_origin(None))

    def test_oauth_state_is_random_one_time_and_hashed_at_rest(self) -> None:
        token_requests = []

        def requester(url, method, headers, body, timeout):
            token_requests.append((url, method, body))
            return {
                "access_token": "new-access-token",
                "refresh_token": "new-refresh-token",
                "expires_in": 3600,
            }

        service = module.DonationService(self.config, self.store, requester=requester, clock=lambda: 1000.0)
        first_url = service.oauth_start_url()
        first_state = first_url.split("state=", 1)[1]
        stored = self.store.get(module.OAUTH_STATE_KEY)
        self.assertNotIn(first_state, str(stored))

        service.oauth_callback("authorization-code", first_state)
        self.assertEqual(len(token_requests), 1)
        self.assertIsNone(self.store.get(module.OAUTH_STATE_KEY))
        with self.assertRaises(ValueError):
            service.oauth_callback("authorization-code", first_state)

        second_url = service.oauth_start_url()
        self.assertNotEqual(first_url, second_url)

    def test_recent_payload_is_sanitized_and_cached(self) -> None:
        calls = []

        def requester(url, method, headers, body, timeout):
            calls.append(url)
            if url == module.DONATIONS_URL + "?page=1":
                return {
                    "data": [
                        {
                            "id": "123",
                            "username": " Driver\nName ",
                            "message": "hello\x00 world",
                            "amount": "500",
                            "currency": "rub",
                            "created_at": "2026-08-20 12:00:00",
                            "private": "must-not-leak",
                        }
                    ],
                    "links": {"next": None},
                }
            if url.startswith(module.GOAL_URL):
                return {"data": []}
            raise AssertionError(f"Unexpected request: {url}")

        self.store.put(
            module.TOKEN_KEY,
            {
                "access_token": "access-token",
                "refresh_token": "refresh-token",
                "expires_at": 5000,
            },
            1000,
        )
        service = module.DonationService(self.config, self.store, requester=requester, clock=lambda: 1000.0)
        first = service.recent()
        second = service.recent()

        self.assertEqual(first, second)
        self.assertEqual(first["items"][0]["username"], "Driver Name")
        self.assertEqual(first["items"][0]["message"], "hello world")
        self.assertEqual(first["items"][0]["amount"], 500)
        self.assertNotIn("private", first["items"][0])
        self.assertEqual(calls.count(module.DONATIONS_URL + "?page=1"), 1)


class HandlerSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        config = make_config(Path(self.temp_dir.name) / "state.sqlite3")
        service = module.DonationService(config, module.StateStore(config.state_path))
        self.server = module.Server(("127.0.0.1", 0), service)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def request(self, method: str, path: str, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        connection.request(method, path, headers=headers or {})
        response = connection.getresponse()
        body = response.read()
        result = response.status, dict(response.getheaders()), body
        connection.close()
        return result

    def test_proxy_cannot_start_or_inspect_oauth(self) -> None:
        for path in ("/oauth/start", "/oauth/status"):
            status, _, _ = self.request("GET", path, {"X-Forwarded-For": "203.0.113.5"})
            self.assertEqual(status, 404)

    def test_disallowed_origin_gets_no_cors_grant(self) -> None:
        status, headers, _ = self.request("GET", "/health", {"Origin": "https://evil.example"})
        self.assertEqual(status, 200)
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_mutating_methods_are_rejected(self) -> None:
        status, _, _ = self.request("POST", "/recent")
        self.assertEqual(status, 405)


if __name__ == "__main__":
    unittest.main()
