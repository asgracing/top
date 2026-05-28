import argparse
import json
import logging
import os
import re
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_SERVER_DIR = Path(r"C:\Assetto Corsa Competizione Dedicated Server Public 08.2025\server")
ENV_SERVER_DIR = "ACC_BAN_SERVER_DIR"
ENV_LOG_FILE = "ACC_BAN_LOG_FILE"
ENV_FORBIDDEN_CAR_MODEL = "ACC_BAN_FORBIDDEN_CAR_MODEL"
ENV_POLL_SECONDS = "ACC_BAN_WATCH_POLL_SECONDS"
ENV_CONFIRM_WINDOW_MS = "ACC_BAN_CONFIRM_WINDOW_MS"
ENV_FROM_START = "ACC_BAN_WATCH_FROM_START"

LOG_FILE_NAME = "server.log"
ADMINS_FILE_NAME = "admins.json"
ADMIN_ALIASES_FILE_NAME = "admin_aliases.json"
BANLIST_FILE_NAME = "banlist.json"
ENTRYLIST_FILE_NAME = "entrylist.json"
LIVE_STATE_FILE_NAME = "live_drivers.json"
WATCHER_LOG_FILE_NAME = "ban_watcher.log"

DEFAULT_FORBIDDEN_CAR_MODEL = 50
DEFAULT_POLL_SECONDS = 1.0
DEFAULT_CONFIRM_WINDOW_MS = 10000
MAX_READ_BYTES = 1024 * 1024
MAX_BUFFER_CHARS = 65536
MAX_CONNECTION_CACHE = 512

TIMESTAMPED_RECORD_RE = re.compile(r"(?ms)(\d+):\s*(.*?)(?=\s+\d+:\s)")
LOCATED_ENTRY_RE = re.compile(r"Located entryListId\s+[-\d]+\s+for connection\s+(\d+)\s+(S\d+)", re.I)
CONNECTION_RE = re.compile(
    r"New connection request:\s+id\s+(\d+)\s+(.+?)\s+(S\d+)\s+on car model\s+(\d+)",
    re.I,
)
CAR_RE = re.compile(
    r"Creating new car connection:\s+carId\s+(\d+),\s+carModel\s+(\d+),\s+raceNumber\s+#?(\d+)",
    re.I,
)
RECONNECT_RE = re.compile(
    r"Recognized reconnect:\s+carId\s+(\d+),\s+carModel\s+(\d+),\s+raceNumber\s+#?(\d+)",
    re.I,
)
HANDSHAKE_RE = re.compile(r"Sent handshake response for car\s+(\d+)\s+connection\s+(\d+)\b", re.I)
CHAT_BAN_RE = re.compile(r"CHAT\s+(.+?):\s*/ban\s+#?(\d+)\b", re.I)
REMOVE_CONN_RE = re.compile(r"(?:Removing dead connection\s+|Removed connection due to \(quick\) reconnect:\s*)(\d+)\b", re.I)
CLIENT_CLOSED_RE = re.compile(r"Client\s+(\d+)\s+closed the connection", re.I)
REMOVE_CAR_RE = re.compile(r"car\s+(\d+)\s+has no driving connection anymore,\s+will remove it", re.I)
PURGE_CAR_RE = re.compile(r"Purging car_id\s+(\d+)", re.I)
RESET_CONNECTIONS_RE = re.compile(r"Server starting|Listening to TCP", re.I)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip()).casefold()


def normalize_steam_id(value: str) -> str:
    player_id = str(value or "").strip()
    if not player_id:
        return ""
    if player_id[:1].upper() == "S":
        return "S" + player_id[1:].strip()
    if player_id.isdigit():
        return "S" + player_id
    return player_id


def load_json(path: Path, default):
    if not path.exists():
        return default

    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            return json.load(handle)
    except Exception as exc:
        logging.warning("Failed to read %s: %s", path, exc)
        return default


def write_json_atomic(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temp_name = handle.name

    Path(temp_name).replace(path)


def normalize_admins(raw) -> set[str]:
    admins = raw.get("admins", []) if isinstance(raw, dict) else []
    return {normalize_steam_id(value) for value in admins if normalize_steam_id(value).startswith("S")}


def normalize_banlist(raw) -> list[dict]:
    if not isinstance(raw, list):
        return []

    normalized = []
    seen = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        player_id = str(item.get("playerID") or item.get("playerId") or "").strip()
        if not player_id or player_id in seen:
            continue
        seen.add(player_id)
        normalized.append({**item, "playerID": player_id})
    return normalized


class AccBanWatcher:
    def __init__(
        self,
        server_dir: Path,
        log_file: Path,
        forbidden_car_model: int,
        confirm_window_ms: int,
        dry_run: bool = False,
    ):
        self.server_dir = server_dir
        self.cfg_dir = server_dir / "cfg"
        self.log_file = log_file
        self.admins_file = self.cfg_dir / ADMINS_FILE_NAME
        self.admin_aliases_file = self.cfg_dir / ADMIN_ALIASES_FILE_NAME
        self.banlist_file = self.cfg_dir / BANLIST_FILE_NAME
        self.entrylist_file = self.cfg_dir / ENTRYLIST_FILE_NAME
        self.live_state_file = self.cfg_dir / LIVE_STATE_FILE_NAME
        self.forbidden_car_model = forbidden_car_model
        self.confirm_window_ms = confirm_window_ms
        self.dry_run = dry_run

        self.connections: dict[int, dict] = {}
        self.pending_connection_ids: list[int] = []
        self.live_by_race_number: dict[int, dict] = {}
        self.live_by_connection: dict[int, dict] = {}
        self.live_by_car: dict[int, dict] = {}
        self.live_by_name: dict[str, list[dict]] = {}
        self.car_specs: dict[int, dict] = {}
        self.pending_bans: list[dict] = []
        self.admin_aliases: dict[str, dict] = self.read_admin_aliases_file()
        self.live_state_dirty = False
        self.last_live_state_write_monotonic = 0.0

    def load_admins(self) -> set[str]:
        return normalize_admins(load_json(self.admins_file, {"admins": []}))

    def read_admin_aliases_file(self) -> dict[str, dict]:
        raw = load_json(self.admin_aliases_file, {})
        if not isinstance(raw, dict):
            return {}

        aliases = {}
        for key, value in raw.items():
            if isinstance(value, dict):
                player_id = normalize_steam_id(value.get("playerID") or value.get("playerId") or "")
                name = str(value.get("name") or key or "").strip()
            else:
                player_id = normalize_steam_id(value)
                name = str(key or "").strip()

            name_key = normalize_name(name or key)
            if name_key and player_id.startswith("S"):
                aliases[name_key] = {
                    "playerID": player_id,
                    "name": name or key,
                    "lastSeenAt": value.get("lastSeenAt") if isinstance(value, dict) else None,
                }
        return aliases

    def load_admin_aliases(self) -> dict[str, dict]:
        return dict(self.admin_aliases)

    def remember_admin_alias(self, player_id: str | None, name: str | None) -> None:
        player_id = normalize_steam_id(player_id or "")
        name = str(name or "").strip()
        name_key = normalize_name(name)
        if not player_id or not name_key or player_id not in self.load_admins():
            return

        aliases = self.load_admin_aliases()
        aliases[name_key] = {
            "playerID": player_id,
            "name": name,
            "lastSeenAt": utc_now_iso(),
        }
        self.admin_aliases = aliases
        if self.dry_run:
            logging.info("DRY RUN: would remember admin alias %r -> %s", name, player_id)
            return
        write_json_atomic(self.admin_aliases_file, aliases)

    def build_entrylist(self) -> dict:
        admins = normalize_admins(load_json(self.admins_file, {"admins": []}))
        banlist = normalize_banlist(load_json(self.banlist_file, []))
        banned_ids = {item["playerID"] for item in banlist}

        entries = []
        for player_id in sorted(admins - banned_ids):
            entries.append(
                {
                    "drivers": [{"playerID": player_id}],
                    "raceNumber": -1,
                    "forcedCarModel": -1,
                    "overrideDriverInfo": 0,
                    "isServerAdmin": 1,
                }
            )

        for item in sorted(banlist, key=lambda row: row.get("playerID", "")):
            entries.append(
                {
                    "drivers": [{"playerID": item["playerID"]}],
                    "raceNumber": -1,
                    "forcedCarModel": self.forbidden_car_model,
                    "overrideDriverInfo": 0,
                    "isServerAdmin": 0,
                }
            )

        return {"entries": entries, "forceEntryList": 0}

    def write_entrylist(self) -> None:
        entrylist = self.build_entrylist()
        if self.dry_run:
            logging.info("DRY RUN: would write %s with %s entries", self.entrylist_file, len(entrylist["entries"]))
            return
        write_json_atomic(self.entrylist_file, entrylist)
        logging.info("Wrote %s with %s entries", self.entrylist_file, len(entrylist["entries"]))

    def live_drivers(self) -> list[dict]:
        drivers = list(self.live_by_connection.values())
        latest_by_player: dict[str, dict] = {}
        anonymous = []
        for driver in drivers:
            player_id = normalize_steam_id(driver.get("playerID") or "")
            row = {
                "position": 0,
                "raceNumber": driver.get("raceNumber"),
                "car_number": driver.get("raceNumber"),
                "connectionId": driver.get("connectionId"),
                "carId": driver.get("carId"),
                "carModel": driver.get("carModel"),
                "car_model": driver.get("carModel"),
                "playerID": player_id,
                "steam_id": player_id,
                "name": driver.get("name") or "",
                "lastSeenAt": driver.get("lastSeenAt"),
                "source": "ban_watcher",
            }
            if player_id:
                current = latest_by_player.get(player_id)
                if not current or (row.get("connectionId") or -1) >= (current.get("connectionId") or -1):
                    latest_by_player[player_id] = row
            else:
                anonymous.append(row)

        result = list(latest_by_player.values()) + anonymous
        result.sort(key=lambda item: (item.get("raceNumber") if item.get("raceNumber") is not None else 9999, item.get("name") or ""))
        for index, item in enumerate(result, start=1):
            item["position"] = index
        return result

    def write_live_state(self, force: bool = False) -> None:
        if not force and not self.live_state_dirty:
            return
        now = time.monotonic()
        if not force and now - self.last_live_state_write_monotonic < 2.0:
            return
        payload = {
            "updatedAt": utc_now_iso(),
            "source": "acc_ban_watcher",
            "drivers": self.live_drivers(),
        }
        if self.dry_run:
            logging.info("DRY RUN: would write %s with %s live drivers", self.live_state_file, len(payload["drivers"]))
        else:
            write_json_atomic(self.live_state_file, payload)
        self.live_state_dirty = False
        self.last_live_state_write_monotonic = now

    def reset_live_state(self, clear_connections: bool = False) -> None:
        self.pending_connection_ids.clear()
        self.live_by_race_number.clear()
        self.live_by_connection.clear()
        self.live_by_car.clear()
        self.live_by_name.clear()
        self.car_specs.clear()
        self.pending_bans.clear()
        if clear_connections:
            self.connections.clear()
        self.live_state_dirty = True

    def add_live_driver(self, race_number: int, car_id: int, car_model: int, connection_id: int) -> None:
        connection = self.connections.get(connection_id, {})
        old_for_conn = self.live_by_connection.get(connection_id)
        if old_for_conn:
            self.remove_live_driver(old_for_conn, remove_connection=False)
        old_for_car = self.live_by_car.get(car_id)
        if old_for_car:
            self.remove_live_driver(old_for_car, remove_connection=False)
        old_for_number = self.live_by_race_number.get(race_number)
        if old_for_number:
            self.remove_live_driver(old_for_number, remove_connection=False)
        driver = {
            "connectionId": connection_id,
            "carId": car_id,
            "carModel": car_model,
            "raceNumber": race_number,
            "playerID": connection.get("playerID"),
            "name": connection.get("name"),
            "lastSeenAt": utc_now_iso(),
        }
        self.live_by_race_number[race_number] = driver
        self.live_by_connection[connection_id] = driver
        self.live_by_car[car_id] = driver
        self.car_specs[car_id] = {"raceNumber": race_number, "carModel": car_model}

        name_key = normalize_name(driver.get("name"))
        if name_key:
            self.live_by_name.setdefault(name_key, [])
            self.live_by_name[name_key] = [
                item for item in self.live_by_name[name_key] if item.get("connectionId") != connection_id
            ]
            self.live_by_name[name_key].append(driver)
            self.remember_admin_alias(driver.get("playerID"), driver.get("name"))

        self.live_state_dirty = True
        logging.info(
            "Live driver #%s conn=%s car=%s steam=%s name=%s",
            race_number,
            connection_id,
            car_id,
            driver.get("playerID"),
            driver.get("name"),
        )

    def remove_live_driver(self, driver: dict | None, remove_connection: bool = True) -> None:
        if not driver:
            return
        connection_id = driver.get("connectionId")
        car_id = driver.get("carId")
        race_number = driver.get("raceNumber")
        if connection_id is not None:
            self.live_by_connection.pop(connection_id, None)
            if remove_connection:
                self.connections.pop(connection_id, None)
            self.pending_connection_ids = [item for item in self.pending_connection_ids if item != connection_id]
        if car_id is not None:
            self.live_by_car.pop(car_id, None)
        if race_number is not None:
            current = self.live_by_race_number.get(race_number)
            if not current or current.get("connectionId") == connection_id:
                self.live_by_race_number.pop(race_number, None)
        name_key = normalize_name(driver.get("name"))
        if name_key in self.live_by_name:
            self.live_by_name[name_key] = [
                item for item in self.live_by_name[name_key] if item.get("connectionId") != connection_id
            ]
            if not self.live_by_name[name_key]:
                self.live_by_name.pop(name_key, None)
        self.live_state_dirty = True

    def attach_car_to_connection(self, car_id: int, connection_id: int) -> None:
        spec = self.car_specs.get(car_id)
        connection = self.connections.get(connection_id)
        if not spec or not connection:
            return
        current = self.live_by_car.get(car_id)
        if current and current.get("connectionId") == connection_id and current.get("playerID"):
            return
        self.add_live_driver(
            race_number=int(spec.get("raceNumber")),
            car_id=car_id,
            car_model=int(spec.get("carModel")),
            connection_id=connection_id,
        )

    def resolve_admin_player_id(self, chat_name: str, admins: set[str]) -> str | None:
        matches = self.live_by_name.get(normalize_name(chat_name), [])
        player_ids = {item.get("playerID") for item in matches if item.get("playerID") in admins}
        if len(player_ids) == 1:
            return next(iter(player_ids))
        if len(player_ids) > 1:
            logging.warning("Ambiguous chat admin name %r, matches=%s", chat_name, sorted(player_ids))

        alias = self.load_admin_aliases().get(normalize_name(chat_name), {})
        alias_player_id = normalize_steam_id(alias.get("playerID") or "")
        if alias_player_id in admins:
            logging.info("Resolved admin %r via saved alias: %s", chat_name, alias_player_id)
            return alias_player_id

        return None

    def queue_ban(self, log_ms: int, admin_name: str, race_number: int) -> None:
        admins = self.load_admins()
        admin_player_id = self.resolve_admin_player_id(admin_name, admins)
        if admin_player_id not in admins:
            logging.info("Ignoring /ban from non-admin or unknown chat name=%r steam=%s", admin_name, admin_player_id)
            return

        target = self.live_by_race_number.get(race_number)
        if not target or not target.get("playerID"):
            logging.warning("Pending /ban #%s could not be resolved to a live SteamID", race_number)
            return

        pending = {
            "logMs": log_ms,
            "adminName": admin_name,
            "adminPlayerID": admin_player_id,
            "raceNumber": race_number,
            "connectionId": target.get("connectionId"),
            "carId": target.get("carId"),
            "playerID": target.get("playerID"),
            "name": target.get("name"),
            "seenDisconnect": False,
            "seenCarRemove": False,
            "createdAt": utc_now_iso(),
        }
        self.pending_bans.append(pending)
        logging.info(
            "Queued pending ban #%s target=%s steam=%s by admin=%s",
            race_number,
            pending["name"],
            pending["playerID"],
            admin_player_id,
        )

    def confirm_ban_if_ready(self, pending: dict) -> bool:
        if not pending.get("seenDisconnect") or not pending.get("seenCarRemove"):
            return False

        banlist = normalize_banlist(load_json(self.banlist_file, []))
        player_id = pending["playerID"]
        if any(item.get("playerID") == player_id for item in banlist):
            logging.info("Ban already exists for %s, refreshing entrylist only", player_id)
            self.write_entrylist()
            return True

        banlist.append(
            {
                "playerID": player_id,
                "name": pending.get("name"),
                "raceNumber": pending.get("raceNumber"),
                "carId": pending.get("carId"),
                "connectionId": pending.get("connectionId"),
                "bannedAt": utc_now_iso(),
                "source": "server.log chat /ban",
                "adminPlayerID": pending.get("adminPlayerID"),
                "adminName": pending.get("adminName"),
            }
        )

        if self.dry_run:
            logging.info("DRY RUN: would add ban for %s %s", player_id, pending.get("name"))
        else:
            write_json_atomic(self.banlist_file, banlist)
            logging.info("Added ban for %s %s", player_id, pending.get("name"))

        self.write_entrylist()
        return True

    def mark_disconnect(self, log_ms: int, connection_id: int) -> None:
        disconnected_driver = self.live_by_connection.get(connection_id)
        for pending in self.pending_bans:
            if pending.get("connectionId") == connection_id and self.is_within_confirm_window(log_ms, pending):
                pending["seenDisconnect"] = True
                if disconnected_driver and disconnected_driver.get("playerID"):
                    pending.update(
                        {
                            "connectionId": disconnected_driver.get("connectionId"),
                            "carId": disconnected_driver.get("carId"),
                            "playerID": disconnected_driver.get("playerID"),
                            "name": disconnected_driver.get("name"),
                            "raceNumber": disconnected_driver.get("raceNumber"),
                        }
                    )
                logging.info("Pending ban #%s saw disconnect conn=%s", pending["raceNumber"], connection_id)
            elif pending.get("raceNumber") and disconnected_driver and pending.get("raceNumber") == disconnected_driver.get("raceNumber") and self.is_within_confirm_window(log_ms, pending):
                pending["seenDisconnect"] = True
                pending.update(
                    {
                        "connectionId": disconnected_driver.get("connectionId"),
                        "carId": disconnected_driver.get("carId"),
                        "playerID": disconnected_driver.get("playerID"),
                        "name": disconnected_driver.get("name"),
                        "raceNumber": disconnected_driver.get("raceNumber"),
                    }
                )
                logging.info("Pending ban #%s matched disconnect conn=%s target=%s", pending["raceNumber"], connection_id, pending.get("playerID"))

    def mark_car_remove(self, log_ms: int, car_id: int) -> None:
        removed_driver = self.live_by_car.get(car_id)
        for pending in self.pending_bans:
            if pending.get("carId") == car_id and self.is_within_confirm_window(log_ms, pending):
                pending["seenCarRemove"] = True
                if removed_driver and removed_driver.get("playerID"):
                    pending.update(
                        {
                            "connectionId": removed_driver.get("connectionId"),
                            "carId": removed_driver.get("carId"),
                            "playerID": removed_driver.get("playerID"),
                            "name": removed_driver.get("name"),
                            "raceNumber": removed_driver.get("raceNumber"),
                        }
                    )
                logging.info("Pending ban #%s saw car remove car=%s", pending["raceNumber"], car_id)
            elif pending.get("raceNumber") and removed_driver and pending.get("raceNumber") == removed_driver.get("raceNumber") and self.is_within_confirm_window(log_ms, pending):
                pending["seenCarRemove"] = True
                pending.update(
                    {
                        "connectionId": removed_driver.get("connectionId"),
                        "carId": removed_driver.get("carId"),
                        "playerID": removed_driver.get("playerID"),
                        "name": removed_driver.get("name"),
                        "raceNumber": removed_driver.get("raceNumber"),
                    }
                )
                logging.info("Pending ban #%s matched car remove car=%s target=%s", pending["raceNumber"], car_id, pending.get("playerID"))

        self.remove_live_driver(removed_driver)

    def is_within_confirm_window(self, log_ms: int, pending: dict) -> bool:
        return 0 <= log_ms - int(pending.get("logMs", 0)) <= self.confirm_window_ms

    def prune_pending_bans(self, log_ms: int) -> None:
        kept = []
        for pending in self.pending_bans:
            if self.confirm_ban_if_ready(pending):
                continue
            if log_ms - int(pending.get("logMs", 0)) > self.confirm_window_ms:
                logging.warning(
                    "Dropping unconfirmed /ban #%s target=%s steam=%s",
                    pending.get("raceNumber"),
                    pending.get("name"),
                    pending.get("playerID"),
                )
                continue
            kept.append(pending)
        self.pending_bans = kept

    def process_record(self, log_ms: int, message: str) -> None:
        for line in message.splitlines() or [message]:
            if RESET_CONNECTIONS_RE.search(line):
                self.reset_live_state(clear_connections=True)
                continue

            located = LOCATED_ENTRY_RE.search(line)
            if located:
                connection_id = int(located.group(1))
                self.connections.setdefault(connection_id, {})["playerID"] = located.group(2)
                self.prune_connection_cache()

            connection = CONNECTION_RE.search(line)
            if connection:
                connection_id = int(connection.group(1))
                player_name = connection.group(2).strip()
                player_id = connection.group(3)
                self.connections[connection_id] = {
                    **self.connections.get(connection_id, {}),
                    "name": player_name,
                    "playerID": player_id,
                    "carModel": int(connection.group(4)),
                }
                self.remember_admin_alias(player_id, player_name)
                if connection_id not in self.live_by_connection and connection_id not in self.pending_connection_ids:
                    self.pending_connection_ids.append(connection_id)
                    if len(self.pending_connection_ids) > MAX_CONNECTION_CACHE:
                        self.pending_connection_ids = self.pending_connection_ids[-MAX_CONNECTION_CACHE:]
                self.prune_connection_cache()

            car = CAR_RE.search(line) or RECONNECT_RE.search(line)
            if car:
                car_id = int(car.group(1))
                self.car_specs[car_id] = {
                    "carModel": int(car.group(2)),
                    "raceNumber": int(car.group(3)),
                }
                self.add_live_driver(
                    race_number=int(car.group(3)),
                    car_id=car_id,
                    car_model=int(car.group(2)),
                    connection_id=self.pop_pending_connection(),
                )

            handshake = HANDSHAKE_RE.search(line)
            if handshake:
                self.attach_car_to_connection(int(handshake.group(1)), int(handshake.group(2)))

            chat_ban = CHAT_BAN_RE.search(line)
            if chat_ban:
                self.queue_ban(log_ms, chat_ban.group(1).strip(), int(chat_ban.group(2)))

            remove_conn = CLIENT_CLOSED_RE.search(line) or REMOVE_CONN_RE.search(line)
            if remove_conn:
                self.mark_disconnect(log_ms, int(remove_conn.group(1)))

            remove_car = REMOVE_CAR_RE.search(line) or PURGE_CAR_RE.search(line)
            if remove_car:
                self.mark_car_remove(log_ms, int(remove_car.group(1)))

        self.prune_pending_bans(log_ms)
        self.write_live_state()

    def pop_pending_connection(self) -> int:
        while self.pending_connection_ids:
            connection_id = self.pending_connection_ids.pop(0)
            if connection_id in self.connections and connection_id not in self.live_by_connection:
                return connection_id
        if self.connections:
            return max(self.connections)
        return -1

    def prune_connection_cache(self) -> None:
        if len(self.connections) <= MAX_CONNECTION_CACHE:
            return

        protected = set(self.live_by_connection) | set(self.pending_connection_ids)
        removable = [connection_id for connection_id in sorted(self.connections) if connection_id not in protected]
        for connection_id in removable[: len(self.connections) - MAX_CONNECTION_CACHE]:
            self.connections.pop(connection_id, None)

    def process_text(self, text: str) -> str:
        last_end = 0
        for match in TIMESTAMPED_RECORD_RE.finditer(text):
            last_end = match.end()
            self.process_record(int(match.group(1)), match.group(2).strip())
        remainder = text[last_end:]
        if len(remainder) > MAX_BUFFER_CHARS:
            logging.warning("Dropping oversized partial log buffer: %s chars", len(remainder))
            return remainder[-MAX_BUFFER_CHARS:]
        return remainder

    def follow(self, poll_seconds: float, from_start: bool = False, replay_once: bool = False) -> None:
        self.write_entrylist()
        buffer = ""
        position = 0
        if self.log_file.exists() and not from_start:
            position = self.log_file.stat().st_size

        logging.info("Watching %s from %s", self.log_file, "start" if from_start else "end")
        while True:
            if not self.log_file.exists():
                logging.warning("Log file not found: %s", self.log_file)
                if replay_once:
                    return
                time.sleep(poll_seconds)
                continue

            size = self.log_file.stat().st_size
            if size < position:
                logging.info("Log file was truncated, restarting from beginning")
                position = 0
                buffer = ""

            with self.log_file.open("r", encoding="utf-8", errors="replace") as handle:
                handle.seek(position)
                chunk = handle.read(MAX_READ_BYTES)
                position = handle.tell()

            if chunk:
                buffer = self.process_text(buffer + chunk)
            elif replay_once:
                if buffer.strip():
                    self.process_text(buffer)
                self.write_live_state(force=True)
                logging.info("Replay finished at byte %s", position)
                return
            else:
                self.write_live_state()

            time.sleep(poll_seconds)


def resolve_server_dir(value: str | None) -> Path:
    if value:
        return Path(value).expanduser()
    env_value = os.getenv(ENV_SERVER_DIR, "").strip()
    if env_value:
        return Path(env_value).expanduser()
    return DEFAULT_SERVER_DIR


def configure_logging(server_dir: Path) -> None:
    log_path = server_dir / "cfg" / WATCHER_LOG_FILE_NAME
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Watch ACC server.log and persist /ban commands into entrylist.json.")
    parser.add_argument("--server-dir", help="ACC server directory containing cfg and log folders.")
    parser.add_argument("--log-file", help="Path to server.log. Defaults to <server-dir>\\log\\server.log.")
    parser.add_argument("--forbidden-car-model", type=int, default=None, help="Car model assigned to banned players.")
    parser.add_argument("--poll-seconds", type=float, default=None, help="Log polling interval.")
    parser.add_argument("--confirm-window-ms", type=int, default=None, help="Milliseconds to confirm ban disconnect.")
    parser.add_argument("--from-start", action="store_true", help="Read existing server.log from the beginning.")
    parser.add_argument("--replay-once", action="store_true", help="Read available log content once, then exit.")
    parser.add_argument("--dry-run", action="store_true", help="Parse and log actions without writing JSON files.")
    parser.add_argument("--build-once", action="store_true", help="Only rebuild entrylist.json from admins.json and banlist.json.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    server_dir = resolve_server_dir(args.server_dir)
    log_file = Path(args.log_file).expanduser() if args.log_file else Path(
        os.getenv(ENV_LOG_FILE, "") or server_dir / "log" / LOG_FILE_NAME
    )
    forbidden_car_model = args.forbidden_car_model or int(
        os.getenv(ENV_FORBIDDEN_CAR_MODEL, DEFAULT_FORBIDDEN_CAR_MODEL)
    )
    poll_seconds = args.poll_seconds or float(os.getenv(ENV_POLL_SECONDS, DEFAULT_POLL_SECONDS))
    confirm_window_ms = args.confirm_window_ms or int(
        os.getenv(ENV_CONFIRM_WINDOW_MS, DEFAULT_CONFIRM_WINDOW_MS)
    )
    from_start_value = os.getenv(ENV_FROM_START, "").strip().lower()
    from_start = args.from_start or from_start_value not in {"0", "false", "no", "off", "end"}

    configure_logging(server_dir)
    watcher = AccBanWatcher(
        server_dir=server_dir,
        log_file=log_file,
        forbidden_car_model=forbidden_car_model,
        confirm_window_ms=confirm_window_ms,
        dry_run=args.dry_run,
    )

    if args.build_once:
        watcher.write_entrylist()
        watcher.write_live_state(force=True)
        return

    watcher.follow(poll_seconds, from_start=from_start, replay_once=args.replay_once)


if __name__ == "__main__":
    main()
