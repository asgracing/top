import json
import logging
import math
import os
import re
import shutil
import subprocess
import time
import hashlib
from datetime import date, datetime
from pathlib import Path
TOOL_DIR = Path(__file__).resolve().parent
ENV_BASE_DIR = "ACC_SERVER_BASE_DIR"
ENV_GIT_EXE = "ACC_GIT_EXE"
ENV_SUNSET_SERVER_BASE_DIR = "ACC_SUNSET_SERVER_BASE_DIR"
ENV_HOURLY_RESULTS_DIR = "ACC_HOURLY_RESULTS_DIR"
ENV_AUTO_GIT_PUSH = "ACC_STATS_AUTO_GIT_PUSH"
ENV_SERVER_PORT_GROUPS_JSON = "ACC_SERVER_PORT_GROUPS_JSON"


def normalize_server_base_dir(path: Path) -> Path:
    expanded = path.expanduser()
    if expanded.name.lower() == "server":
        return expanded

    server_child = expanded / "server"
    if server_child.exists():
        return server_child

    return expanded


def normalize_results_dir(path: Path) -> Path:
    expanded = path.expanduser()
    if expanded.name.lower() == "results":
        return expanded

    normalized_base = normalize_server_base_dir(expanded)
    results_child = normalized_base / "results"
    if results_child.exists() or normalized_base.exists():
        return results_child

    return expanded


def resolve_base_dir() -> Path:
    env_value = os.environ.get(ENV_BASE_DIR, "").strip()
    if env_value:
        return normalize_server_base_dir(Path(env_value))

    sibling_server_dir = TOOL_DIR.parent
    if sibling_server_dir.name.lower() == "server":
        return sibling_server_dir

    known_locations = [
        Path(r"C:\Assetto Corsa Competizione Dedicated Server Public 08.2025\server"),
        Path(r"I:\SteamLibrary\steamapps\common\Assetto Corsa Competizione Dedicated Server Public 08.2025\server"),
    ]
    for candidate in known_locations:
        if candidate.exists():
            return normalize_server_base_dir(candidate)

    return normalize_server_base_dir(known_locations[0])


def resolve_git_executable():
    env_value = os.environ.get(ENV_GIT_EXE, "").strip()
    if env_value:
        env_path = Path(env_value).expanduser()
        if env_path.exists():
            return str(env_path)

    path_git = shutil.which("git")
    if path_git:
        return path_git

    known_locations = [
        Path(r"C:\Program Files\Git\cmd\git.exe"),
        Path(r"C:\Program Files\Git\bin\git.exe"),
        Path(r"C:\Program Files (x86)\Git\cmd\git.exe"),
        Path(r"C:\Program Files (x86)\Git\bin\git.exe"),
    ]
    for candidate in known_locations:
        if candidate.exists():
            return str(candidate)

    return None


def resolve_sunset_base_dir() -> Path:
    env_value = os.environ.get(ENV_SUNSET_SERVER_BASE_DIR, "").strip()
    if env_value:
        return normalize_server_base_dir(Path(env_value))

    return normalize_server_base_dir(Path(r"C:\Assetto Corsa Competizione Dedicated Server Public 08.2025 Sunset\server"))


def resolve_hourly_results_dir() -> Path:
    env_value = os.environ.get(ENV_HOURLY_RESULTS_DIR, "").strip()
    if env_value:
        return normalize_results_dir(Path(env_value))

    return normalize_results_dir(Path(r"C:\Assetto Corsa Competizione Dedicated Server Race"))


def default_server_port_groups() -> dict:
    return {
        "main": {
            "tcp_port": 10040,
            "udp_port": 10039,
            "broadcast_port": 8999,
        },
        "sunset": {
            "tcp_port": 10038,
            "udp_port": 10037,
            "broadcast_port": None,
        },
    }


def resolve_server_port_groups() -> dict:
    raw_value = os.environ.get(ENV_SERVER_PORT_GROUPS_JSON, "").strip()
    if not raw_value:
        return default_server_port_groups()

    try:
        parsed = json.loads(raw_value)
    except Exception:
        return default_server_port_groups()

    if not isinstance(parsed, dict):
        return default_server_port_groups()

    normalized = {}
    for name, ports in parsed.items():
        if not isinstance(name, str) or not isinstance(ports, dict):
            continue

        tcp_port = ports.get("tcp_port")
        udp_port = ports.get("udp_port")
        broadcast_port = ports.get("broadcast_port")
        if not isinstance(tcp_port, int) or not isinstance(udp_port, int):
            continue

        normalized[name.strip().lower() or name] = {
            "tcp_port": tcp_port,
            "udp_port": udp_port,
            "broadcast_port": broadcast_port if isinstance(broadcast_port, int) else None,
        }

    return normalized or default_server_port_groups()


BASE_DIR = resolve_base_dir()
SUNSET_BASE_DIR = resolve_sunset_base_dir()
RESULTS_DIR = BASE_DIR / "results"
SUNSET_RESULTS_DIR = SUNSET_BASE_DIR / "results"
HOURLY_RESULTS_DIR = resolve_hourly_results_dir()
MERGED_RESULTS_DIR = RESULTS_DIR / "_merged"
OUTPUT_DIR = BASE_DIR / "top-data"
RACES_DIR = OUTPUT_DIR / "races"
DRIVERS_DIR = OUTPUT_DIR / "drivers"
CARS_DIR = OUTPUT_DIR / "cars"
V2_DIR = OUTPUT_DIR / "v2"
V2_TABLES_DIR = V2_DIR / "tables"
V2_RACES_DIR = V2_DIR / "races"
V2_RACE_DETAILS_DIR = V2_RACES_DIR / "details"

SNAPSHOT_FILE = OUTPUT_DIR / "snapshot.json"
SERVER_STATUS_FILE = OUTPUT_DIR / "server_status.json"
RACES_FILE = RACES_DIR / "races.json"
DRIVERS_INDEX_FILE = DRIVERS_DIR / "drivers.json"
CARS_FILE = CARS_DIR / "cars.json"
V2_MANIFEST_FILE = V2_DIR / "manifest.json"
V2_HOME_FILE = V2_DIR / "home.json"
V2_OVERLAY_FILE = V2_DIR / "overlay.json"
V2_RACES_SUMMARY_FILE = V2_RACES_DIR / "summary.json"
V2_LEADERBOARD_FILE = V2_TABLES_DIR / "leaderboard.json"
V2_BESTLAPS_FILE = V2_TABLES_DIR / "bestlaps.json"
V2_SAFETY_FILE = V2_TABLES_DIR / "safety.json"
STATE_FILE = TOOL_DIR / "parser_state.json"
LOG_FILE = TOOL_DIR / "parser.log"

GIT_EXE = resolve_git_executable()

AUTO_GIT_PUSH = os.getenv(ENV_AUTO_GIT_PUSH, "true").strip().lower() not in {"0", "false", "no", "off"}
COMMIT_MESSAGE_PREFIX = "ACC stats update"
SCHEMA_VERSION = 9
V2_SCHEMA_VERSION = 1
V2_RACE_PAGE_SIZE = 10
V2_HOME_TABLE_PREVIEW_LIMIT = 100

SERVER_PROCESS_NAME = "accServer.exe"
SERVER_PORT_GROUPS = resolve_server_port_groups()

POINTS_MAP = {
    1: 25,
    2: 18,
    3: 15,
    4: 12,
    5: 10,
    6: 8,
    7: 6,
    8: 4,
    9: 2,
    10: 1,
}

HOURLY_POINTS_MAP = {position: 26 - position for position in range(1, 26)}
BEST_LAP_BONUS = 1
HOURLY_POINTS_MULTIPLIER = 5
INVALID_LAP_VALUES = {0, -1, 2147483647, 4294967295}
MIN_FILE_AGE_SECONDS = 10
SCORING_BASE_MAX_POINTS = POINTS_MAP[1]

COMPARISON_METRIC_DIRECTIONS = {
    "championship_rank": "lower",
    "bestlap_rank": "lower",
    "points": "higher",
    "wins": "higher",
    "podiums": "higher",
    "races": "higher",
    "average_finish": "lower",
    "best_lap_ms": "lower",
    "average_pace_ms": "lower",
    "average_positions_delta": "higher",
    "penalty_points": "lower",
}

CAR_MODEL_NAMES = {
    0: "Porsche 991 GT3 R",
    1: "Mercedes-AMG GT3",
    2: "Ferrari 488 GT3",
    3: "Audi R8 LMS",
    4: "Lamborghini Huracan GT3",
    5: "McLaren 650S GT3",
    6: "Nissan GT-R Nismo GT3 2018",
    7: "BMW M6 GT3",
    8: "Bentley Continental GT3 2018",
    9: "Porsche 991II GT3 Cup",
    10: "Nissan GT-R Nismo GT3 2017",
    11: "Bentley Continental GT3 2016",
    12: "Aston Martin V12 Vantage GT3",
    13: "Lamborghini Gallardo R-EX",
    14: "Jaguar G3",
    15: "Lexus RC F GT3",
    16: "Lamborghini Huracan Evo (2019)",
    17: "Honda NSX GT3",
    18: "Lamborghini Huracan SuperTrofeo",
    19: "Audi R8 LMS Evo (2019)",
    20: "AMR V8 Vantage (2019)",
    21: "Honda NSX Evo (2019)",
    22: "McLaren 720S GT3 (2019)",
    23: "Porsche 911II GT3 R (2019)",
    24: "Ferrari 488 GT3 Evo 2020",
    25: "Mercedes-AMG GT3 2020",
    26: "Ferrari 488 Challenge Evo",
    27: "BMW M2 CS Racing",
    28: "Porsche 911 GT3 Cup (Type 992)",
    29: "Lamborghini Huracán Super Trofeo EVO2",
    30: "BMW M4 GT3",
    31: "Audi R8 LMS GT3 evo II",
    32: "Ferrari 296 GT3",
    33: "Lamborghini Huracan Evo2",
    34: "Porsche 992 GT3 R",
    35: "McLaren 720S GT3 Evo 2023",
    36: "Ford Mustang GT3",
}


def configure_logging():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )
    logging.info("Resolved ACC server base directory: %s", BASE_DIR)
    logging.info("Resolved Sunset server base directory: %s", SUNSET_BASE_DIR)
    logging.info("Resolved hourly results directory: %s", HOURLY_RESULTS_DIR)
    if GIT_EXE:
        logging.info("Resolved Git executable: %s", GIT_EXE)
    else:
        logging.warning(
            "Git executable not found. Set %s or install Git for automatic publish.",
            ENV_GIT_EXE,
        )


def robust_read_json(path: Path):
    raw = path.read_bytes()
    encodings = ["utf-16", "utf-16-le", "utf-8-sig", "utf-8", "cp1251"]
    last_error = None

    for enc in encodings:
        try:
            text = raw.decode(enc)
        except Exception as exc:
            last_error = exc
            continue

        text = text.replace("\ufeff", "").replace("\x00", "")

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]

        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)
        text = text.strip()

        try:
            return json.loads(text)
        except Exception as exc:
            last_error = exc

    raise ValueError(f"Failed to read JSON from {path}. Last error: {last_error}")


def load_json(path: Path, default):
    try:
        return robust_read_json(path)
    except Exception as exc:
        logging.warning("Failed to read %s: %s", path, exc)
        return default


def save_json_if_changed(path: Path, data) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    new_text = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False)

    old_text = None
    if path.exists():
        try:
            old_text = path.read_text(encoding="utf-8")
        except Exception:
            old_text = None

    if old_text == new_text:
        return False

    path.write_text(new_text, encoding="utf-8")
    return True


def is_acc_session_result_file(path: Path) -> bool:
    stem = path.stem.upper()
    return stem.endswith("_Q") or stem.endswith("_R")


def sync_external_results_source(source_dir: Path, prefix: str, only_session_results: bool = False):
    if not source_dir.exists():
        logging.info("External results source not found, skipping: %s", source_dir)
        return

    target_root = MERGED_RESULTS_DIR / prefix
    target_root.mkdir(parents=True, exist_ok=True)

    active_targets = set()
    copied_count = 0
    updated_count = 0
    removed_count = 0

    for source_file in source_dir.rglob("*.json"):
        try:
            if only_session_results and not is_acc_session_result_file(source_file):
                continue

            relative_path = source_file.relative_to(source_dir)
            target_dir = target_root / relative_path.parent
            target_file = target_dir / f"{prefix}_{source_file.name}"
            active_targets.add(target_file.resolve())

            target_dir.mkdir(parents=True, exist_ok=True)

            existed_before = target_file.exists()
            should_copy = True
            if existed_before:
                source_stat = source_file.stat()
                target_stat = target_file.stat()
                should_copy = (
                    int(source_stat.st_mtime) != int(target_stat.st_mtime)
                    or int(source_stat.st_size) != int(target_stat.st_size)
                )

            if should_copy:
                shutil.copy2(source_file, target_file)
                if existed_before:
                    updated_count += 1
                else:
                    copied_count += 1
        except Exception as exc:
            logging.warning("Failed to sync external result %s: %s", source_file, exc)

    for target_file in target_root.rglob("*.json"):
        try:
            if target_file.resolve() not in active_targets:
                target_file.unlink()
                removed_count += 1
        except Exception as exc:
            logging.warning("Failed to remove stale imported result %s: %s", target_file, exc)

    logging.info(
        "External results sync complete for '%s': copied=%s, updated=%s, removed=%s",
        prefix,
        copied_count,
        updated_count,
        removed_count,
    )


def ms_to_lap_str(ms):
    if ms is None or ms in INVALID_LAP_VALUES or ms <= 0:
        return None

    minutes = ms // 60000
    seconds = (ms % 60000) // 1000
    millis = ms % 1000
    return f"{minutes}:{seconds:02d}.{millis:03d}"


def is_valid_lap(ms):
    return isinstance(ms, int) and ms > 0 and ms not in INVALID_LAP_VALUES


def normalize_car_name(name: str):
    if not name:
        return None

    text = str(name).strip()
    text = re.sub(r"\s*\(\s*(?:19|20)\d{2}\s*\)\s*$", "", text)
    text = re.sub(r"\s+(?:19|20)\d{2}\s*$", "", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def get_car_info(car_model):
    if car_model is None:
        return {
            "car_model_id": None,
            "car_name_raw": None,
            "car_name": None,
        }

    car_name_raw = CAR_MODEL_NAMES.get(car_model) or f"Car model {car_model}"
    return {
        "car_model_id": car_model,
        "car_name_raw": car_name_raw,
        "car_name": normalize_car_name(car_name_raw),
    }


def extract_driver_name(driver: dict) -> str:
    first_name = (driver or {}).get("firstName", "") or ""
    last_name = (driver or {}).get("lastName", "") or ""
    full_name = f"{first_name} {last_name}".strip()
    if full_name:
        return full_name

    short_name = (driver or {}).get("shortName", "") or ""
    if short_name:
        return short_name

    return "Unknown Driver"


def extract_driver_id_and_name(line: dict):
    current_driver = line.get("currentDriver") or {}
    car = line.get("car") or {}
    drivers = car.get("drivers") or []

    player_id = current_driver.get("playerId")
    display_name = extract_driver_name(current_driver)

    if not player_id and drivers:
        first_driver = drivers[0] or {}
        player_id = first_driver.get("playerId")
        if display_name == "Unknown Driver":
            display_name = extract_driver_name(first_driver)

    return player_id, display_name


def extract_best_lap(line: dict):
    timing = line.get("timing") or {}
    best_lap = timing.get("bestLap")
    return best_lap if is_valid_lap(best_lap) else None


def extract_lap_count(line: dict):
    timing = line.get("timing") or {}
    lap_count = timing.get("lapCount", 0)
    return lap_count if isinstance(lap_count, int) else 0


def extract_total_time(line: dict):
    timing = line.get("timing") or {}
    total_time = timing.get("totalTime")
    if isinstance(total_time, int) and total_time >= 0 and total_time not in INVALID_LAP_VALUES:
        return total_time
    return None


def is_counted_race_result(line: dict):
    return extract_lap_count(line) > 0 and extract_total_time(line) is not None


def build_race_order(lines: list):
    prepared = []

    for idx, line in enumerate(lines, start=1):
        total_time = extract_total_time(line)
        prepared.append(
            {
                "original_index": idx,
                "line": line,
                "lap_count": extract_lap_count(line),
                "total_time": total_time if total_time is not None else 10**15,
            }
        )

    prepared.sort(key=lambda item: (-item["lap_count"], item["total_time"], item["original_index"]))
    return prepared


def dedupe_race_entries(race_order: list, normalized_lines: list):
    line_by_id = {id(item["line"]): item for item in normalized_lines}
    best_lap_by_player = {}

    for item in normalized_lines:
        player_id = item.get("player_id")
        best_lap = item.get("best_lap")
        if not player_id or best_lap is None:
            continue

        current_best = best_lap_by_player.get(player_id)
        if current_best is None or best_lap < current_best:
            best_lap_by_player[player_id] = best_lap

    selected_by_player = {}
    for ordered in race_order:
        item = line_by_id.get(id(ordered["line"]))
        if not item or not item.get("player_id"):
            continue

        player_id = item["player_id"]
        current_counted = is_counted_race_result(ordered["line"])
        existing = selected_by_player.get(player_id)
        if existing is None or (current_counted and not existing["counted"]):
            selected_by_player[player_id] = {
                "ordered": ordered,
                "counted": current_counted,
            }

    selected_line_ids = {
        id(entry["ordered"]["line"])
        for entry in selected_by_player.values()
    }

    deduped_normalized_lines = []
    for item in normalized_lines:
        line_id = id(item["line"])
        if line_id not in selected_line_ids:
            continue

        deduped_item = dict(item)
        player_id = deduped_item.get("player_id")
        if player_id in best_lap_by_player:
            deduped_item["best_lap"] = best_lap_by_player[player_id]
        deduped_normalized_lines.append(deduped_item)

    deduped_line_ids = {id(item["line"]) for item in deduped_normalized_lines}
    deduped_race_order = []
    emitted_line_ids = set()
    for ordered in race_order:
        line_id = id(ordered["line"])
        if line_id not in deduped_line_ids or line_id in emitted_line_ids:
            continue
        deduped_race_order.append(ordered)
        emitted_line_ids.add(line_id)

    return deduped_race_order, deduped_normalized_lines


def create_driver_entry(player_id, display_name):
    return {
        "player_id": player_id,
        "public_id": make_public_driver_id(player_id),
        "driver": display_name,
        "races": 0,
        "wins": 0,
        "podiums": 0,
        "points": 0,
        "average_finish_sum": 0,
        "average_finish": None,
        "best_lap_ms": None,
        "best_lap": None,
        "best_lap_track": None,
        "best_lap_car_model_id": None,
        "best_lap_car_name_raw": None,
        "best_lap_car_name": None,
        "best_lap_session_type": None,
        "last_track": None,
        "last_seen": None,
        "positions_delta_sum": 0,
        "positions_delta_races": 0,
        "average_positions_delta": None,
        "pace_laps_sum_ms": 0,
        "pace_laps_count": 0,
        "average_pace_ms": None,
        "average_pace": None,
        "championship_rank": None,
        "bestlap_rank": None,
        "latest_changes": {},
        "latest_change_at": None,
    }


def create_daily_stats_container(day_str: str):
    return {
        "date": day_str,
        "unique_players_set": set(),
        "sessions_today": 0,
        "races_today": 0,
        "points_earned_today": 0,
        "podiums_today": 0,
        "wins_today": 0,
        "best_lap_today_ms": None,
        "best_lap_today": None,
        "best_lap_today_driver": None,
        "best_lap_today_player_id": None,
        "best_lap_today_track": None,
        "best_lap_today_car_model_id": None,
        "best_lap_today_car_name_raw": None,
        "best_lap_today_car_name": None,
        "best_lap_today_session_type": None,
        "tracks_raced_today_set": set(),
        "driver_races_today": {},
        "driver_points_today": {},
        "driver_day_stats": {},
        "race_participants_total": 0,
    }


def create_state():
    return {
        "schema_version": SCHEMA_VERSION,
        "processed_files": {},
        "drivers": {},
        "online_by_day": {},
        "daily_by_day": {},
        "safety": {},
        "races": {},
        "qualifying_sessions": {},
        "updated_at": None,
    }


def make_public_driver_id(player_id):
    if not player_id:
        return None
    digest = hashlib.sha1(str(player_id).encode("utf-8")).hexdigest()
    return f"drv_{digest[:12]}"


def ensure_driver(drivers: dict, player_id, display_name):
    if player_id not in drivers:
        drivers[player_id] = create_driver_entry(player_id, display_name)
    drivers[player_id]["public_id"] = make_public_driver_id(player_id)
    drivers[player_id]["driver"] = display_name
    return drivers[player_id]


def ensure_safety_driver(safety_stats: dict, player_id, display_name):
    if player_id not in safety_stats:
        safety_stats[player_id] = {
            "player_id": player_id,
            "public_id": make_public_driver_id(player_id),
            "driver": display_name,
            "penalty_count": 0,
            "penalty_points": 0,
            "reasons": {},
            "penalties": {},
            "last_seen": None,
        }

    safety_stats[player_id]["public_id"] = make_public_driver_id(player_id)
    safety_stats[player_id]["driver"] = display_name
    return safety_stats[player_id]


def ensure_online_day(online_stats_by_day: dict, day_str: str):
    if day_str not in online_stats_by_day:
        online_stats_by_day[day_str] = {
            "date": day_str,
            "unique_players_set": set(),
        }

    return online_stats_by_day[day_str]


def ensure_daily_day(daily_by_day: dict, day_str: str):
    if day_str not in daily_by_day:
        daily_by_day[day_str] = create_daily_stats_container(day_str)
    return daily_by_day[day_str]


def ensure_driver_day_entry(daily_stats, player_id, display_name):
    if not player_id:
        return None

    if player_id not in daily_stats["driver_day_stats"]:
        daily_stats["driver_day_stats"][player_id] = {
            "player_id": player_id,
            "public_id": make_public_driver_id(player_id),
            "driver": display_name,
            "points": 0,
            "races": 0,
            "wins": 0,
            "average_finish_sum": 0,
            "average_finish": None,
            "best_lap_ms": None,
            "best_lap": None,
            "best_lap_track": None,
            "best_lap_car_model_id": None,
            "best_lap_car_name_raw": None,
            "best_lap_car_name": None,
            "positions_delta_sum": 0,
            "positions_delta_races": 0,
            "average_positions_delta": None,
        }

    daily_stats["driver_day_stats"][player_id]["public_id"] = make_public_driver_id(player_id)
    daily_stats["driver_day_stats"][player_id]["driver"] = display_name
    return daily_stats["driver_day_stats"][player_id]


def update_driver_day_best_lap(daily_stats, player_id, display_name, best_lap, track_name, car_model):
    if best_lap is None or not player_id:
        return

    entry = ensure_driver_day_entry(daily_stats, player_id, display_name)
    current = entry["best_lap_ms"]
    if current is None or best_lap < current:
        car_info = get_car_info(car_model)
        entry["best_lap_ms"] = best_lap
        entry["best_lap"] = ms_to_lap_str(best_lap)
        entry["best_lap_track"] = track_name
        entry["best_lap_car_model_id"] = car_info["car_model_id"]
        entry["best_lap_car_name_raw"] = car_info["car_name_raw"]
        entry["best_lap_car_name"] = car_info["car_name"]


def add_driver_day_result(
    daily_stats,
    player_id,
    display_name,
    position,
    gained_points,
    best_lap,
    track_name,
    car_model,
):
    if not player_id:
        return

    entry = ensure_driver_day_entry(daily_stats, player_id, display_name)
    entry["races"] += 1
    entry["points"] += gained_points
    entry["average_finish_sum"] += position
    entry["average_finish"] = round(entry["average_finish_sum"] / entry["races"], 2)

    if position == 1:
        entry["wins"] += 1

    update_driver_day_best_lap(daily_stats, player_id, display_name, best_lap, track_name, car_model)


def update_average_positions_delta(stats_entry, positions_delta):
    if not isinstance(positions_delta, int):
        return

    stats_entry["positions_delta_sum"] += positions_delta
    stats_entry["positions_delta_races"] += 1
    stats_entry["average_positions_delta"] = round(
        stats_entry["positions_delta_sum"] / stats_entry["positions_delta_races"],
        2,
    )


def build_session_link_key(data: dict) -> str:
    return "|".join(
        [
            str((data or {}).get("serverName") or "").strip().lower(),
            str((data or {}).get("trackName") or "").strip().lower(),
            str((data or {}).get("raceWeekendIndex") or ""),
            str((data or {}).get("metaData") or "").strip().lower(),
        ]
    )


def build_qualifying_snapshot(path: Path, data: dict, lines: list, normalized_lines: list, file_modified: str):
    positions_by_car_id = {}
    positions_by_player_id = {}
    line_by_id = {id(item["line"]): item for item in normalized_lines}

    for position, line in enumerate(lines, start=1):
        item = line_by_id.get(id(line))
        if not item or not item["player_id"]:
            continue

        car = line.get("car") or {}
        car_id = car.get("carId")
        entry = {
            "position": position,
            "player_id": item["player_id"],
            "driver": item["display_name"],
            "car_id": car_id,
            "race_number": car.get("raceNumber"),
            "source_file": get_relative_result_path(path),
            "finished_at": file_modified,
        }

        if car_id is not None and car_id not in positions_by_car_id:
            positions_by_car_id[str(car_id)] = entry
        if item["player_id"] not in positions_by_player_id:
            positions_by_player_id[item["player_id"]] = entry

    return {
        "session_key": build_session_link_key(data),
        "source_file": get_relative_result_path(path),
        "finished_at": file_modified,
        "positions_by_car_id": positions_by_car_id,
        "positions_by_player_id": positions_by_player_id,
    }


def queue_qualifying_snapshot(state: dict, snapshot: dict):
    session_key = snapshot.get("session_key")
    if not session_key:
        return

    queue = state["qualifying_sessions"].setdefault(session_key, [])
    queue.append(snapshot)


def pop_qualifying_snapshot_for_race(state: dict, data: dict):
    session_key = build_session_link_key(data)
    queue = state.get("qualifying_sessions", {}).get(session_key) or []
    if not queue:
        return None

    snapshot = queue.pop()
    if not queue:
        state["qualifying_sessions"].pop(session_key, None)
    return snapshot


def resolve_start_position(line: dict, player_id, qualifying_snapshot: dict):
    if not qualifying_snapshot or not player_id:
        return None, "unknown"

    car = line.get("car") or {}
    car_id = car.get("carId")
    positions_by_car_id = qualifying_snapshot.get("positions_by_car_id") or {}
    positions_by_player_id = qualifying_snapshot.get("positions_by_player_id") or {}

    if car_id is not None:
        car_entry = positions_by_car_id.get(str(car_id))
        if car_entry and isinstance(car_entry.get("position"), int):
            return car_entry["position"], "qualifying_car_id"

    player_entry = positions_by_player_id.get(player_id)
    if player_entry and isinstance(player_entry.get("position"), int):
        return player_entry["position"], "qualifying_player_id"

    return None, "unknown"


def add_driver_points_day(daily_stats, player_id, display_name, points):
    if not player_id or points <= 0:
        return

    if player_id not in daily_stats["driver_points_today"]:
        daily_stats["driver_points_today"][player_id] = {
            "player_id": player_id,
            "public_id": make_public_driver_id(player_id),
            "driver": display_name,
            "points": 0,
        }

    daily_stats["driver_points_today"][player_id]["points"] += points


def update_daily_best_lap(daily_stats, player_id, display_name, best_lap, track_name, session_type, car_model):
    if best_lap is None:
        return

    current = daily_stats["best_lap_today_ms"]
    if current is None or best_lap < current:
        car_info = get_car_info(car_model)
        daily_stats["best_lap_today_ms"] = best_lap
        daily_stats["best_lap_today"] = ms_to_lap_str(best_lap)
        daily_stats["best_lap_today_driver"] = display_name
        daily_stats["best_lap_today_player_id"] = player_id
        daily_stats["best_lap_today_track"] = track_name
        daily_stats["best_lap_today_car_model_id"] = car_info["car_model_id"]
        daily_stats["best_lap_today_car_name_raw"] = car_info["car_name_raw"]
        daily_stats["best_lap_today_car_name"] = car_info["car_name"]
        daily_stats["best_lap_today_session_type"] = session_type


def update_driver_best_lap(driver_stats, best_lap, track_name, session_type, file_modified, car_model):
    if best_lap is None:
        return

    current_best = driver_stats["best_lap_ms"]
    if current_best is None or best_lap < current_best:
        car_info = get_car_info(car_model)
        driver_stats["best_lap_ms"] = best_lap
        driver_stats["best_lap"] = ms_to_lap_str(best_lap)
        driver_stats["best_lap_track"] = track_name
        driver_stats["best_lap_car_model_id"] = car_info["car_model_id"]
        driver_stats["best_lap_car_name_raw"] = car_info["car_name_raw"]
        driver_stats["best_lap_car_name"] = car_info["car_name"]
        driver_stats["best_lap_session_type"] = session_type
        driver_stats["last_seen"] = file_modified


def build_car_driver_map(lines: list):
    car_driver_map = {}

    for line in lines:
        car = line.get("car") or {}
        car_id = car.get("carId")
        if car_id is None:
            continue

        current_driver = line.get("currentDriver") or {}
        drivers = car.get("drivers") or []

        current_player_id = current_driver.get("playerId")
        current_display_name = extract_driver_name(current_driver)
        if current_player_id:
            car_driver_map[(car_id, current_driver.get("driverIndex", 0))] = (
                current_player_id,
                current_display_name,
            )

        for idx, driver in enumerate(drivers):
            if not driver:
                continue
            player_id = driver.get("playerId")
            if not player_id:
                continue
            display_name = extract_driver_name(driver)
            driver_index = driver.get("driverIndex", idx)
            car_driver_map[(car_id, driver_index)] = (player_id, display_name)

        if current_player_id:
            car_driver_map[(car_id, 0)] = (current_player_id, current_display_name)

    return car_driver_map


def update_driver_average_pace(driver_stats, lap_time_ms):
    if not is_valid_lap(lap_time_ms):
        return

    driver_stats["pace_laps_sum_ms"] += lap_time_ms
    driver_stats["pace_laps_count"] += 1
    average_pace_ms = round(driver_stats["pace_laps_sum_ms"] / driver_stats["pace_laps_count"])
    driver_stats["average_pace_ms"] = average_pace_ms
    driver_stats["average_pace"] = ms_to_lap_str(average_pace_ms)


def process_driver_pace_laps(data: dict, lines: list, drivers: dict):
    laps = data.get("laps") or []
    if not laps:
        return

    car_driver_map = build_car_driver_map(lines)

    for lap in laps:
        if not isinstance(lap, dict) or not lap.get("isValidForBest"):
            continue

        car_id = lap.get("carId")
        driver_index = lap.get("driverIndex", 0)
        mapped = car_driver_map.get((car_id, driver_index)) or car_driver_map.get((car_id, 0))
        if not mapped:
            continue

        player_id, display_name = mapped
        if not player_id:
            continue

        lap_time_ms = lap.get("laptime")
        if not is_valid_lap(lap_time_ms):
            continue

        driver_stats = ensure_driver(drivers, player_id, display_name)
        update_driver_average_pace(driver_stats, lap_time_ms)


def process_penalties(data: dict, lines: list, safety_stats: dict, file_modified: str):
    penalties = []
    for bucket_name in ("penalties", "post_race_penalties"):
        penalties.extend(data.get(bucket_name) or [])
    if not penalties:
        return

    car_driver_map = build_car_driver_map(lines)

    for item in penalties:
        if not isinstance(item, dict):
            continue

        car_id = item.get("carId")
        driver_index = item.get("driverIndex", 0)
        penalty_value = item.get("penaltyValue", 0)
        penalty_reason = item.get("reason") or "Unknown"
        penalty_type = item.get("penalty") or "Unknown"
        if str(penalty_type).strip().lower() == "postracetime":
            continue

        mapped = car_driver_map.get((car_id, driver_index)) or car_driver_map.get((car_id, 0))
        if not mapped:
            continue

        player_id, display_name = mapped
        if not player_id:
            continue

        safety_entry = ensure_safety_driver(safety_stats, player_id, display_name)
        safety_entry["penalty_count"] += 1
        if isinstance(penalty_value, (int, float)):
            safety_entry["penalty_points"] += penalty_value

        reasons = safety_entry.setdefault("reasons", {})
        penalties_map = safety_entry.setdefault("penalties", {})
        reasons[penalty_reason] = reasons.get(penalty_reason, 0) + 1
        penalties_map[penalty_type] = penalties_map.get(penalty_type, 0) + 1
        safety_entry["last_seen"] = file_modified


def build_rank_map(rows: list):
    rank_map = {}
    for index, row in enumerate(rows, start=1):
        player_id = row.get("player_id")
        if player_id:
            rank_map[player_id] = index
    return rank_map


def normalize_points_value(value):
    if value is None:
        return 0

    floor_value = math.floor(value)
    fraction = value - floor_value

    if fraction >= 0.6:
        return floor_value + 1
    return floor_value


def resolve_max_points_for_participants(participant_count: int):
    if participant_count >= 25:
        return 25
    if participant_count >= 20:
        return 20
    if participant_count >= 15:
        return 15
    if participant_count >= 10:
        return 10
    if participant_count >= 5:
        return 5
    return max(participant_count, 0)


def calculate_scaled_points(base_points, participant_count: int):
    if base_points <= 0 or participant_count <= 0:
        return 0

    max_points = resolve_max_points_for_participants(participant_count)
    scale = max_points / SCORING_BASE_MAX_POINTS
    return normalize_points_value(base_points * scale)


def calculate_race_points(position: int, participant_count: int, points_map: dict, has_best_lap: bool = False):
    points = calculate_scaled_points(points_map.get(position, 0), participant_count)
    if has_best_lap:
        points = normalize_points_value(points + BEST_LAP_BONUS)
    return points


def get_points_map_for_source(source: str) -> dict:
    if source == "hourly":
        return HOURLY_POINTS_MAP
    return POINTS_MAP


def get_points_rule_for_source(source: str) -> str:
    if source == "hourly":
        return "scaled_25_to_1_by_classified_x5_all_participants"
    return "scaled_top10_by_classified"


def is_points_eligible_for_source(source: str, counted_for_stats: bool) -> bool:
    if source == "hourly":
        return True
    return counted_for_stats


def build_comparison_snapshot(state: dict):
    drivers = state.get("drivers", {})
    safety = state.get("safety", {})
    leaderboard_rows = build_leaderboard_output(drivers)
    bestlap_rows = build_bestlaps_output(drivers)

    championship_ranks = build_rank_map(leaderboard_rows)
    bestlap_ranks = build_rank_map(bestlap_rows)

    snapshot = {}
    for player_id, driver in drivers.items():
        safety_entry = safety.get(player_id, {})
        snapshot[player_id] = {
            "championship_rank": championship_ranks.get(player_id),
            "bestlap_rank": bestlap_ranks.get(player_id),
            "points": driver.get("points"),
            "wins": driver.get("wins"),
            "podiums": driver.get("podiums"),
            "races": driver.get("races"),
            "average_finish": driver.get("average_finish"),
            "best_lap_ms": driver.get("best_lap_ms"),
            "average_pace_ms": driver.get("average_pace_ms"),
            "average_positions_delta": driver.get("average_positions_delta"),
            "penalty_points": safety_entry.get("penalty_points", 0),
        }
    return snapshot


def build_metric_change(metric_name: str, before, after):
    if before == after:
        return None

    direction = COMPARISON_METRIC_DIRECTIONS.get(metric_name, "higher")
    if before is None and after is None:
        trend = "same"
    elif before is None:
        trend = "up"
    elif after is None:
        trend = "down"
    elif direction == "lower":
        trend = "up" if after < before else "down"
    else:
        trend = "up" if after > before else "down"

    delta = None
    if isinstance(before, (int, float)) and isinstance(after, (int, float)):
        delta = round(after - before, 3)

    return {
        "before": before,
        "after": after,
        "delta": delta,
        "trend": trend,
    }


def build_player_change_set(before_metrics: dict, after_metrics: dict):
    changes = {}
    metric_names = sorted(set(before_metrics.keys()) | set(after_metrics.keys()))
    for metric_name in metric_names:
        change = build_metric_change(
            metric_name,
            before_metrics.get(metric_name),
            after_metrics.get(metric_name),
        )
        if change:
            changes[metric_name] = change
    return changes


def apply_latest_comparisons(state: dict, before_snapshot: dict, after_snapshot: dict, file_modified: str):
    comparisons = {}
    player_ids = sorted(set(before_snapshot.keys()) | set(after_snapshot.keys()) | set(state.get("drivers", {}).keys()))

    for player_id in player_ids:
        if player_id not in state["drivers"]:
            continue

        driver_entry = state["drivers"][player_id]
        before_metrics = before_snapshot.get(player_id, {})
        after_metrics = after_snapshot.get(player_id, {})
        changes = build_player_change_set(before_metrics, after_metrics)

        driver_entry["championship_rank"] = after_metrics.get("championship_rank")
        driver_entry["bestlap_rank"] = after_metrics.get("bestlap_rank")
        driver_entry["latest_changes"] = changes
        driver_entry["latest_change_at"] = file_modified
        comparisons[player_id] = changes

    return comparisons


def build_penalty_lookup(data: dict):
    penalty_lookup = {}

    for bucket_name in ("penalties", "post_race_penalties"):
        for item in data.get(bucket_name) or []:
            if not isinstance(item, dict):
                continue

            car_id = item.get("carId")
            if car_id is None:
                continue

            driver_index = item.get("driverIndex", 0)
            penalty_type = item.get("penalty") or "Unknown"
            if str(penalty_type).strip().lower() == "postracetime":
                continue
            key = (car_id, driver_index)
            entry = penalty_lookup.setdefault(
                key,
                {
                    "count": 0,
                    "penalty_points": 0,
                    "items": [],
                },
            )

            penalty_value = item.get("penaltyValue", 0)
            entry["count"] += 1
            if isinstance(penalty_value, (int, float)):
                entry["penalty_points"] += penalty_value

            entry["items"].append(
                {
                    "type": penalty_type,
                    "reason": item.get("reason") or "Unknown",
                    "value": penalty_value if isinstance(penalty_value, (int, float)) else 0,
                    "bucket": bucket_name,
                }
            )

    return penalty_lookup


def format_total_time(ms):
    if ms is None or not isinstance(ms, int) or ms < 0:
        return None

    total_seconds, millis = divmod(ms, 1000)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}.{millis:03d}"
    return f"{minutes}:{seconds:02d}.{millis:03d}"


def build_race_history_entry(
    path: Path,
    data: dict,
    race_order: list,
    normalized_lines: list,
    scoring_participants_count: int,
    best_lap_driver_id,
    qualifying_snapshot,
    file_modified: str,
):
    line_by_id = {id(item["line"]): item for item in normalized_lines}
    penalty_lookup = build_penalty_lookup(data)
    track_name = data.get("trackName", "unknown")
    source_file = get_relative_result_path(path)
    result_source = get_result_source(path)
    points_map = get_points_map_for_source(result_source)
    points_multiplier = get_points_multiplier_for_source(result_source)
    points_rule = get_points_rule_for_source(result_source)
    participants = []
    winner_name = None
    winner_public_id = None
    race_best_lap = None
    race_best_lap_driver = None
    race_best_lap_public_id = None
    race_best_lap_car_model_id = None
    race_best_lap_car_name_raw = None
    race_best_lap_car_name = None
    winner_total_time_ms = None

    for position, ordered in enumerate(race_order, start=1):
        line = ordered["line"]
        item = line_by_id.get(id(line))
        if not item or not item["player_id"]:
            continue

        car = line.get("car") or {}
        car_id = car.get("carId")
        car_info = get_car_info(car.get("carModel"))
        penalty_data = penalty_lookup.get((car_id, 0), {"count": 0, "penalty_points": 0, "items": []})
        total_time_ms = extract_total_time(line)
        counted_for_stats = is_counted_race_result(line)
        best_lap_ms = item["best_lap"]
        qualifying_position, start_position_source = resolve_start_position(
            line,
            item["player_id"],
            qualifying_snapshot,
        )
        positions_delta = qualifying_position - position if isinstance(qualifying_position, int) else None
        has_best_lap = best_lap_driver_id == item["player_id"]
        points_eligible = is_points_eligible_for_source(result_source, counted_for_stats)
        points = (
            apply_points_multiplier(
                calculate_race_points(position, scoring_participants_count, points_map, has_best_lap),
                points_multiplier,
            )
            if points_eligible
            else 0
        )

        if position == 1:
            winner_name = item["display_name"]
            winner_public_id = make_public_driver_id(item["player_id"])
            winner_total_time_ms = total_time_ms

        if has_best_lap:
            race_best_lap = ms_to_lap_str(best_lap_ms)
            race_best_lap_driver = item["display_name"]
            race_best_lap_public_id = make_public_driver_id(item["player_id"])
            race_best_lap_car_model_id = car_info["car_model_id"]
            race_best_lap_car_name_raw = car_info["car_name_raw"]
            race_best_lap_car_name = car_info["car_name"]

        gap_ms = None
        if winner_total_time_ms is not None and total_time_ms is not None and position > 1:
            gap_ms = max(0, total_time_ms - winner_total_time_ms)

        participants.append(
            {
                "position": position,
                "qualifying_position": qualifying_position,
                "start_position": qualifying_position,
                "start_position_source": start_position_source,
                "positions_delta": positions_delta,
                "positions_gained": max(positions_delta, 0) if isinstance(positions_delta, int) else None,
                "positions_lost": max(-positions_delta, 0) if isinstance(positions_delta, int) else None,
                "player_id": item["player_id"],
                "public_id": make_public_driver_id(item["player_id"]),
                "driver": item["display_name"],
                "car_id": car_id,
                "car_model": car.get("carModel"),
                "car_model_id": car_info["car_model_id"],
                "car_name_raw": car_info["car_name_raw"],
                "car_name": car_info["car_name"],
                "race_number": car.get("raceNumber"),
                "cup_category": car.get("cupCategory"),
                "lap_count": extract_lap_count(line),
                "best_lap_ms": best_lap_ms,
                "best_lap": ms_to_lap_str(best_lap_ms),
                "total_time_ms": total_time_ms,
                "total_time": format_total_time(total_time_ms),
                "gap_ms": gap_ms,
                "gap": format_total_time(gap_ms) if gap_ms is not None else None,
                "counted_for_stats": counted_for_stats,
                "counted_for_points": points_eligible,
                "points": points,
                "had_best_lap": has_best_lap,
                "penalty_count": penalty_data["count"],
                "penalty_points": penalty_data["penalty_points"],
                "penalties": penalty_data["items"],
            }
        )

    return {
        "race_id": source_file,
        "source_file": source_file,
        "result_source": result_source,
        "result_source_label": get_result_source_label(result_source),
        "race_type": result_source,
        "points_multiplier": points_multiplier,
        "date": get_file_day_str(path),
        "finished_at": file_modified,
        "track": track_name,
        "session_type": str(data.get("sessionType", "")).upper().strip(),
        "server_name": data.get("serverName"),
        "meta_data": data.get("metaData"),
        "participants_count": len(participants),
        "scoring_participants_count": scoring_participants_count,
        "points_rule": points_rule,
        "winner": winner_name,
        "winner_public_id": winner_public_id,
        "best_lap": race_best_lap,
        "best_lap_driver": race_best_lap_driver,
        "best_lap_public_id": race_best_lap_public_id,
        "best_lap_car_model_id": race_best_lap_car_model_id,
        "best_lap_car_name_raw": race_best_lap_car_name_raw,
        "best_lap_car_name": race_best_lap_car_name,
        "results": participants,
        "total_penalties": sum(item["penalty_count"] for item in participants),
    }


def get_file_day_str(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime).date().isoformat()


def get_relative_result_path(path: Path) -> str:
    return str(path.relative_to(RESULTS_DIR)).replace("\\", "/")


def get_result_source(path: Path) -> str:
    relative_path = get_relative_result_path(path).lower()
    if relative_path.startswith("_merged/hourly/"):
        return "hourly"
    if relative_path.startswith("_merged/sunset/"):
        return "sunset"
    return "main"


def get_result_source_label(source: str) -> str:
    if source == "hourly":
        return "часовая"
    if source == "sunset":
        return "sunset"
    return "main"


def get_points_multiplier_for_source(source: str) -> int:
    return HOURLY_POINTS_MULTIPLIER if source == "hourly" else 1


def apply_points_multiplier(points: int, multiplier: int) -> int:
    if not isinstance(multiplier, int) or multiplier <= 1:
        return points
    return normalize_points_value(points * multiplier)


def safe_check_output(command: str) -> str:
    try:
        return subprocess.check_output(command, shell=True).decode(errors="ignore")
    except Exception:
        return ""


def get_server_process_info():
    output = safe_check_output(f'tasklist | findstr /I "{SERVER_PROCESS_NAME}"')
    lines = [line for line in output.splitlines() if SERVER_PROCESS_NAME.lower() in line.lower()]
    if not lines:
        return None

    parts = lines[0].split()
    pid = None
    if len(parts) >= 2:
        try:
            pid = int(parts[1])
        except Exception:
            pid = None

    return {
        "name": SERVER_PROCESS_NAME,
        "pid": pid,
        "raw": lines[0].strip(),
        "count": len(lines),
    }


def get_established_connections_for_port(port: int):
    output = safe_check_output(f"netstat -ano | findstr :{port} | findstr ESTABLISHED")
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    unique_remotes = set()

    for line in lines:
        parts = line.split()
        if len(parts) >= 3:
            remote = parts[2]
            if remote != "0.0.0.0:0":
                unique_remotes.add(remote)

    return lines, unique_remotes


def port_is_listening(port: int, protocol: str = "TCP") -> bool:
    output = safe_check_output(f"netstat -ano | findstr :{port}")
    for line in output.splitlines():
        upper = line.upper()
        if f":{port}" not in line or protocol.upper() not in upper:
            continue
        if protocol.upper() == "TCP" and "LISTENING" in upper:
            return True
        if protocol.upper() == "UDP":
            return True
    return False


def build_port_group_status(name: str, tcp_port: int, udp_port: int, broadcast_port=None):
    tcp_listening = port_is_listening(tcp_port, "TCP")
    udp_listening = port_is_listening(udp_port, "UDP")
    broadcast_listening = bool(broadcast_port and port_is_listening(broadcast_port, "UDP"))
    _established_lines, unique_remotes = get_established_connections_for_port(tcp_port)
    players_online = len(unique_remotes) if tcp_listening else 0
    server_online = tcp_listening or udp_listening or broadcast_listening

    if tcp_listening:
        status = "online"
    elif server_online:
        status = "online_process_only"
    else:
        status = "offline"

    return {
        "name": name,
        "status": status,
        "server_online": server_online,
        "players_online": players_online,
        "tcp_port": tcp_port,
        "udp_port": udp_port,
        "broadcast_port": broadcast_port,
        "tcp_listening": tcp_listening,
        "udp_listening": udp_listening,
        "broadcast_listening": broadcast_listening,
    }


def build_server_status_output():
    now_str = datetime.now().isoformat(timespec="seconds")
    process_info = get_server_process_info()
    servers = {
        name: build_port_group_status(
            name,
            ports["tcp_port"],
            ports["udp_port"],
            ports.get("broadcast_port"),
        )
        for name, ports in SERVER_PORT_GROUPS.items()
    }

    server_online = any(server["server_online"] for server in servers.values())
    players_online = sum(server["players_online"] for server in servers.values())
    tcp_listening = any(server["tcp_listening"] for server in servers.values())
    udp_listening = any(server["udp_listening"] for server in servers.values())
    broadcast_listening = any(server["broadcast_listening"] for server in servers.values())

    if not server_online:
        status = "offline"
    elif tcp_listening:
        status = "online"
    else:
        status = "online_process_only"

    return {
        "status": status,
        "server_online": server_online,
        "players_online": players_online,
        "tcp_listening": tcp_listening,
        "udp_listening": udp_listening,
        "broadcast_listening": broadcast_listening,
        "updated_at": now_str,
        "server_process_name": SERVER_PROCESS_NAME,
        "server_process_count": process_info.get("count", 0) if process_info else 0,
        "servers": servers,
        "main": servers.get("main"),
        "sunset": servers.get("sunset"),
    }


def save_server_status_output(server_status: dict, changed_files: list[str] | None = None) -> bool:
    changed = save_json_if_changed(SERVER_STATUS_FILE, server_status)
    if changed and isinstance(changed_files, list):
        changed_files.append("server_status.json")
    return changed


def publish_server_status_only() -> dict:
    server_status = build_server_status_output()
    changed_files = []
    save_server_status_output(server_status, changed_files)

    logging.info(
        "Standalone server status refresh: %s (%s players)%s",
        server_status["status"],
        server_status["players_online"],
        " [changed]" if changed_files else "",
    )

    git_publish_if_needed(changed_files)
    return server_status


def process_file(path: Path, state: dict):
    data = load_json(path, {})
    if not data:
        return

    session_type = str(data.get("sessionType", "")).upper().strip()
    track_name = data.get("trackName", "unknown")
    file_modified = datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds")
    file_day_str = get_file_day_str(path)

    online_day = ensure_online_day(state["online_by_day"], file_day_str)
    daily_stats = ensure_daily_day(state["daily_by_day"], file_day_str)

    lines = (((data or {}).get("sessionResult") or {}).get("leaderBoardLines") or [])
    if not lines:
        return

    daily_stats["sessions_today"] += 1

    process_penalties(
        data=data,
        lines=lines,
        safety_stats=state["safety"],
        file_modified=file_modified,
    )

    normalized_lines = []
    for line in lines:
        player_id, display_name = extract_driver_id_and_name(line)
        best_lap = extract_best_lap(line)
        normalized_lines.append(
            {
                "line": line,
                "player_id": player_id,
                "display_name": display_name,
                "best_lap": best_lap,
            }
        )

        if player_id:
            online_day["unique_players_set"].add(player_id)

    if session_type in {"Q", "R"}:
        for item in normalized_lines:
            player_id = item["player_id"]
            if not player_id:
                continue

            driver_stats = ensure_driver(state["drivers"], player_id, item["display_name"])
            car = (item["line"] or {}).get("car") or {}
            update_driver_best_lap(
                driver_stats,
                item["best_lap"],
                track_name,
                session_type,
                file_modified,
                car.get("carModel"),
            )

            daily_stats["unique_players_set"].add(player_id)
            update_daily_best_lap(
                daily_stats,
                player_id,
                item["display_name"],
                item["best_lap"],
                track_name,
                session_type,
                car.get("carModel"),
            )

    if session_type != "R":
        if session_type == "Q":
            snapshot = build_qualifying_snapshot(
                path=path,
                data=data,
                lines=lines,
                normalized_lines=normalized_lines,
                file_modified=file_modified,
            )
            queue_qualifying_snapshot(state, snapshot)
        return

    result_source = get_result_source(path)
    points_map = get_points_map_for_source(result_source)
    points_multiplier = get_points_multiplier_for_source(result_source)
    before_snapshot = build_comparison_snapshot(state)
    process_driver_pace_laps(
        data=data,
        lines=lines,
        drivers=state["drivers"],
    )

    race_order = build_race_order(lines)
    race_order, normalized_lines = dedupe_race_entries(race_order, normalized_lines)
    qualifying_snapshot = pop_qualifying_snapshot_for_race(state, data)
    best_lap_in_race = None
    best_lap_driver_id = None
    participant_count = 0
    scoring_participants_count = 0
    line_by_id = {id(item["line"]): item for item in normalized_lines}

    for ordered in race_order:
        item = line_by_id.get(id(ordered["line"]))
        if not item or not item["player_id"]:
            continue

        participant_count += 1
        daily_stats["unique_players_set"].add(item["player_id"])
        if is_counted_race_result(ordered["line"]):
            scoring_participants_count += 1

        best_lap = item["best_lap"]
        if best_lap is not None and (best_lap_in_race is None or best_lap < best_lap_in_race):
            best_lap_in_race = best_lap
            best_lap_driver_id = item["player_id"]

    daily_stats["races_today"] += 1
    daily_stats["tracks_raced_today_set"].add(track_name)
    daily_stats["race_participants_total"] += participant_count

    state["races"][get_relative_result_path(path)] = build_race_history_entry(
        path=path,
        data=data,
        race_order=race_order,
        normalized_lines=normalized_lines,
        scoring_participants_count=scoring_participants_count,
        best_lap_driver_id=best_lap_driver_id,
        qualifying_snapshot=qualifying_snapshot,
        file_modified=file_modified,
    )

    for position, ordered in enumerate(race_order, start=1):
        item = line_by_id.get(id(ordered["line"]))
        if not item or not item["player_id"]:
            continue

        player_id = item["player_id"]
        display_name = item["display_name"]
        best_lap = item["best_lap"]
        car = (ordered["line"] or {}).get("car") or {}
        counted_for_stats = is_counted_race_result(ordered["line"])
        qualifying_position, _start_position_source = resolve_start_position(
            ordered["line"],
            player_id,
            qualifying_snapshot,
        )
        positions_delta = qualifying_position - position if isinstance(qualifying_position, int) else None

        driver_stats = ensure_driver(state["drivers"], player_id, display_name)
        driver_stats["last_track"] = track_name
        driver_stats["last_seen"] = file_modified
        points_eligible = is_points_eligible_for_source(result_source, counted_for_stats)
        gained_points = 0
        if points_eligible:
            gained_points = calculate_race_points(
                position,
                scoring_participants_count,
                points_map,
                has_best_lap=best_lap_driver_id == player_id,
            )
            gained_points = apply_points_multiplier(gained_points, points_multiplier)

        if counted_for_stats:
            driver_stats["races"] += 1
            driver_stats["average_finish_sum"] += position
            driver_stats["average_finish"] = round(driver_stats["average_finish_sum"] / driver_stats["races"], 2)
            if position == 1:
                driver_stats["wins"] += 1
            if position <= 3:
                driver_stats["podiums"] += 1

            update_average_positions_delta(driver_stats, positions_delta)

            daily_stats["driver_races_today"][player_id] = daily_stats["driver_races_today"].get(player_id, 0) + 1
            add_driver_day_result(
                daily_stats,
                player_id,
                display_name,
                position,
                gained_points,
                best_lap,
                track_name,
                car.get("carModel"),
            )
            update_average_positions_delta(
                daily_stats["driver_day_stats"][player_id],
                positions_delta,
            )

            if position == 1:
                daily_stats["wins_today"] += 1
            if position <= 3:
                daily_stats["podiums_today"] += 1

        if points_eligible:
            driver_stats["points"] += gained_points
            daily_stats["points_earned_today"] += gained_points
            add_driver_points_day(daily_stats, player_id, display_name, gained_points)

    after_snapshot = build_comparison_snapshot(state)
    latest_comparisons = apply_latest_comparisons(
        state,
        before_snapshot,
        after_snapshot,
        file_modified,
    )

    race_entry = state["races"].get(get_relative_result_path(path))
    if race_entry:
        for result in race_entry.get("results", []):
            player_id = result.get("player_id")
            changes = latest_comparisons.get(player_id, {})
            result["changes"] = changes
            result["rank_change"] = changes.get("championship_rank")
            result["bestlap_rank_change"] = changes.get("bestlap_rank")


def collect_result_files():
    files = []

    if not RESULTS_DIR.exists():
        logging.warning("Results folder not found: %s", RESULTS_DIR)
        return files

    sync_external_results_source(SUNSET_RESULTS_DIR, "sunset")
    sync_external_results_source(HOURLY_RESULTS_DIR, "hourly", only_session_results=True)

    now = time.time()

    for file_path in RESULTS_DIR.rglob("*.json"):
        try:
            age = now - file_path.stat().st_mtime
            if age > MIN_FILE_AGE_SECONDS:
                files.append(file_path)
            else:
                logging.info("Skipping fresh file: %s", file_path.name)
        except Exception as exc:
            logging.warning("Failed to inspect file %s: %s", file_path, exc)

    return sorted(files)


def get_file_signature(path: Path):
    stat = path.stat()
    return {
        "mtime": int(stat.st_mtime),
        "size": int(stat.st_size),
    }


def serialize_state(state: dict):
    serializable = {
        "schema_version": state.get("schema_version", SCHEMA_VERSION),
        "processed_files": dict(sorted(state.get("processed_files", {}).items())),
        "drivers": state.get("drivers", {}),
        "safety": state.get("safety", {}),
        "races": state.get("races", {}),
        "qualifying_sessions": state.get("qualifying_sessions", {}),
        "updated_at": state.get("updated_at"),
        "online_by_day": {},
        "daily_by_day": {},
    }

    for day_str, day in state.get("online_by_day", {}).items():
        serializable["online_by_day"][day_str] = {
            "date": day_str,
            "unique_players": sorted(day.get("unique_players_set", set())),
        }

    for day_str, daily in state.get("daily_by_day", {}).items():
        entry = dict(daily)
        entry["unique_players"] = sorted(entry.pop("unique_players_set", set()))
        entry["tracks_raced_today"] = sorted(entry.pop("tracks_raced_today_set", set()))
        serializable["daily_by_day"][day_str] = entry

    return serializable


def load_state():
    if not STATE_FILE.exists():
        return create_state()

    raw = load_json(STATE_FILE, {})
    if raw.get("schema_version") != SCHEMA_VERSION:
        logging.info("State schema changed or missing. Starting from clean state.")
        return create_state()

    state = create_state()
    state["processed_files"] = raw.get("processed_files", {})
    state["drivers"] = raw.get("drivers", {})
    state["safety"] = raw.get("safety", {})
    state["races"] = raw.get("races", {})
    state["qualifying_sessions"] = raw.get("qualifying_sessions", {})
    state["updated_at"] = raw.get("updated_at")

    for day_str, day in (raw.get("online_by_day", {}) or {}).items():
        state["online_by_day"][day_str] = {
            "date": day_str,
            "unique_players_set": set(day.get("unique_players", [])),
        }

    for day_str, daily in (raw.get("daily_by_day", {}) or {}).items():
        restored = create_daily_stats_container(day_str)
        restored.update(daily)
        restored["unique_players_set"] = set(daily.get("unique_players", []))
        restored["tracks_raced_today_set"] = set(daily.get("tracks_raced_today", []))
        state["daily_by_day"][day_str] = restored

    return state


def save_state(state: dict):
    state["updated_at"] = datetime.now().isoformat(timespec="seconds")
    save_json_if_changed(STATE_FILE, serialize_state(state))


def build_leaderboard_output(drivers: dict):
    leaderboard = list(drivers.values())
    leaderboard.sort(
        key=lambda row: (
            -row["points"],
            -row["wins"],
            -row["podiums"],
            row["average_finish"] if row["average_finish"] is not None else 9999,
            row["driver"].lower() if row["driver"] else "",
        )
    )

    for idx, row in enumerate(leaderboard, start=1):
        row["rank"] = idx
        row["rank_change"] = (row.get("latest_changes") or {}).get("championship_rank")

    return leaderboard


def build_bestlaps_output(drivers: dict):
    bestlaps = [row for row in drivers.values() if row["best_lap_ms"] is not None]
    bestlaps.sort(
        key=lambda row: (
            row["best_lap_ms"],
            row["driver"].lower() if row["driver"] else "",
        )
    )

    result = []
    for idx, row in enumerate(bestlaps, start=1):
        result.append(
            {
                "rank": idx,
                "player_id": row["player_id"],
                "public_id": row.get("public_id"),
                "driver": row["driver"],
                "best_lap_ms": row["best_lap_ms"],
                "best_lap": row["best_lap"],
                "track": row["best_lap_track"],
                "car_model_id": row.get("best_lap_car_model_id"),
                "car_name_raw": row.get("best_lap_car_name_raw"),
                "car_name": row.get("best_lap_car_name"),
                "session_type": row["best_lap_session_type"],
                "updated_at": row["last_seen"],
                "rank_change": (row.get("latest_changes") or {}).get("bestlap_rank"),
                "latest_changes": row.get("latest_changes", {}),
            }
        )

    return result


def build_safety_output(safety_stats: dict):
    safety = list(safety_stats.values())
    safety.sort(
        key=lambda row: (
            -row["penalty_points"],
            -row["penalty_count"],
            row["driver"].lower() if row["driver"] else "",
        )
    )

    for idx, row in enumerate(safety, start=1):
        row["rank"] = idx

    return safety


def build_driver_profiles(state: dict):
    races = build_races_output(state.get("races", {}))
    safety_map = state.get("safety", {})
    prepared = {}

    for player_id, driver in state.get("drivers", {}).items():
        prepared[player_id] = {
            "driver": driver,
            "race_history": [],
            "track_stats": {},
            "fastest_lap_awards": 0,
            "last_race_at": None,
        }

    for race in races:
        finished_at = race.get("finished_at")
        track_name = race.get("track") or "unknown"

        for result in race.get("results", []):
            player_id = result.get("player_id")
            if player_id not in prepared:
                continue

            bucket = prepared[player_id]
            if not bucket["last_race_at"] or (finished_at and finished_at > bucket["last_race_at"]):
                bucket["last_race_at"] = finished_at

            if result.get("had_best_lap"):
                bucket["fastest_lap_awards"] += 1

            bucket["race_history"].append(
                {
                    "race_id": race.get("race_id"),
                    "finished_at": finished_at,
                    "track": track_name,
                    "car_model_id": result.get("car_model_id"),
                    "car_name_raw": result.get("car_name_raw"),
                    "car_name": result.get("car_name"),
                    "position": result.get("position"),
                    "participants_count": race.get("participants_count"),
                    "scoring_participants_count": race.get("scoring_participants_count"),
                    "points_rule": race.get("points_rule"),
                    "points_multiplier": race.get("points_multiplier"),
                    "winner": race.get("winner"),
                    "points": result.get("points", 0),
                    "qualifying_position": result.get("qualifying_position"),
                    "start_position": result.get("start_position"),
                    "start_position_source": result.get("start_position_source"),
                    "positions_delta": result.get("positions_delta"),
                    "positions_gained": result.get("positions_gained"),
                    "positions_lost": result.get("positions_lost"),
                    "best_lap": result.get("best_lap"),
                    "best_lap_ms": result.get("best_lap_ms"),
                    "total_time": result.get("total_time"),
                    "total_time_ms": result.get("total_time_ms"),
                    "gap": result.get("gap"),
                    "gap_ms": result.get("gap_ms"),
                    "lap_count": result.get("lap_count"),
                    "counted_for_stats": result.get("counted_for_stats", True),
                    "counted_for_points": result.get("counted_for_points", result.get("counted_for_stats", True)),
                    "had_best_lap": result.get("had_best_lap", False),
                    "penalty_count": result.get("penalty_count", 0),
                    "penalty_points": result.get("penalty_points", 0),
                    "changes": result.get("changes", {}),
                    "rank_change": result.get("rank_change"),
                    "bestlap_rank_change": result.get("bestlap_rank_change"),
                }
            )

            if not result.get("counted_for_stats", True):
                continue

            track_entry = bucket["track_stats"].setdefault(
                track_name,
                {
                    "track": track_name,
                    "races": 0,
                    "wins": 0,
                    "podiums": 0,
                    "points": 0,
                    "finish_sum": 0,
                    "average_finish": None,
                    "best_lap_ms": None,
                    "best_lap": None,
                },
            )
            track_entry["races"] += 1
            track_entry["points"] += result.get("points", 0)
            position = result.get("position")
            if isinstance(position, int):
                track_entry["finish_sum"] += position
                track_entry["average_finish"] = round(track_entry["finish_sum"] / track_entry["races"], 2)
                if position == 1:
                    track_entry["wins"] += 1
                if position <= 3:
                    track_entry["podiums"] += 1

            best_lap_ms = result.get("best_lap_ms")
            if isinstance(best_lap_ms, int) and best_lap_ms > 0:
                current_best = track_entry["best_lap_ms"]
                if current_best is None or best_lap_ms < current_best:
                    track_entry["best_lap_ms"] = best_lap_ms
                    track_entry["best_lap"] = result.get("best_lap")

    profiles = {}
    for player_id, bucket in prepared.items():
        driver = bucket["driver"]
        public_id = driver.get("public_id") or make_public_driver_id(player_id)
        safety_entry = safety_map.get(player_id, {})
        race_history = bucket["race_history"]
        race_history.sort(key=lambda row: row.get("finished_at") or "", reverse=True)

        track_stats_list = list(bucket["track_stats"].values())
        track_stats_list.sort(
            key=lambda row: (
                -row["races"],
                -row["points"],
                row["average_finish"] if row["average_finish"] is not None else 9999,
                row["track"],
            )
        )

        most_raced_track = track_stats_list[0]["track"] if track_stats_list else None
        average_points = round(driver["points"] / driver["races"], 2) if driver["races"] else 0

        profiles[public_id] = {
            "public_id": public_id,
            "driver": driver["driver"],
            "summary": {
                "points": driver["points"],
                "average_points_per_race": average_points,
                "races": driver["races"],
                "wins": driver["wins"],
                "podiums": driver["podiums"],
                "average_finish": driver["average_finish"],
                "best_lap": driver["best_lap"],
                "best_lap_ms": driver["best_lap_ms"],
                "best_lap_track": driver["best_lap_track"],
                "best_lap_car_model_id": driver.get("best_lap_car_model_id"),
                "best_lap_car_name_raw": driver.get("best_lap_car_name_raw"),
                "best_lap_car_name": driver.get("best_lap_car_name"),
                "best_lap_session_type": driver["best_lap_session_type"],
                "penalty_count": safety_entry.get("penalty_count", 0),
                "penalty_points": safety_entry.get("penalty_points", 0),
                "fastest_lap_awards": bucket["fastest_lap_awards"],
                "most_raced_track": most_raced_track,
                "last_race_at": bucket["last_race_at"],
                "last_seen": driver.get("last_seen"),
                "average_pace_ms": driver.get("average_pace_ms"),
                "average_pace": driver.get("average_pace"),
                "win_rate": round((driver["wins"] / driver["races"]) * 100, 2) if driver["races"] else 0,
                "podium_rate": round((driver["podiums"] / driver["races"]) * 100, 2) if driver["races"] else 0,
                "average_positions_delta": driver.get("average_positions_delta"),
                "positions_delta_races": driver.get("positions_delta_races", 0),
                "championship_rank": driver.get("championship_rank"),
                "bestlap_rank": driver.get("bestlap_rank"),
                "latest_changes": driver.get("latest_changes", {}),
                "latest_change_at": driver.get("latest_change_at"),
            },
            "recent_form": [row.get("position") for row in race_history[:5] if row.get("position") is not None],
            "track_stats": track_stats_list,
            "race_history": race_history,
            "penalties": {
                "penalty_count": safety_entry.get("penalty_count", 0),
                "penalty_points": safety_entry.get("penalty_points", 0),
                "reasons": safety_entry.get("reasons", {}),
                "types": safety_entry.get("penalties", {}),
            },
        }

    return profiles


def build_drivers_index(state: dict):
    profiles = build_driver_profiles(state)
    rows = []
    for public_id, profile in profiles.items():
        summary = profile["summary"]
        rows.append(
            {
                "public_id": public_id,
                "driver": profile["driver"],
                "points": summary["points"],
                "average_points_per_race": summary["average_points_per_race"],
                "races": summary["races"],
                "wins": summary["wins"],
                "podiums": summary["podiums"],
                "average_finish": summary["average_finish"],
                "best_lap": summary["best_lap"],
                "best_lap_track": summary["best_lap_track"],
                "best_lap_car_model_id": summary.get("best_lap_car_model_id"),
                "best_lap_car_name_raw": summary.get("best_lap_car_name_raw"),
                "best_lap_car_name": summary.get("best_lap_car_name"),
                "penalty_count": summary["penalty_count"],
                "penalty_points": summary["penalty_points"],
                "last_race_at": summary["last_race_at"],
                "championship_rank": summary.get("championship_rank"),
                "bestlap_rank": summary.get("bestlap_rank"),
                "latest_changes": summary.get("latest_changes", {}),
                "latest_change_at": summary.get("latest_change_at"),
            }
        )

    rows.sort(
        key=lambda row: (
            -row["points"],
            -row["wins"],
            -row["podiums"],
            row["average_finish"] if row["average_finish"] is not None else 9999,
            row["driver"].lower(),
        )
    )
    return rows, profiles


def build_online_output(online_stats_by_day: dict):
    result = []
    for day_str in sorted(online_stats_by_day.keys()):
        day = online_stats_by_day[day_str]
        result.append(
            {
                "date": day_str,
                "unique_players": len(day.get("unique_players_set", set())),
            }
        )
    return result


def build_races_output(races: dict):
    result = list((races or {}).values())
    result.sort(
        key=lambda row: (
            row.get("finished_at") or "",
            row.get("source_file") or "",
        ),
        reverse=True,
    )
    return result


def build_cars_output(races: dict):
    cars = {}

    for race in build_races_output(races):
        for result in race.get("results", []):
            if not result.get("counted_for_stats", True):
                continue

            car_model_id = result.get("car_model_id")
            car_name = result.get("car_name")
            if car_model_id is None or not car_name:
                continue

            entry = cars.setdefault(
                car_model_id,
                {
                    "car_model_id": car_model_id,
                    "car_name_raw": result.get("car_name_raw"),
                    "car_name": car_name,
                    "races": 0,
                    "wins": 0,
                    "podiums": 0,
                    "win_rate": 0,
                    "average_finish_sum": 0,
                    "average_finish": None,
                    "unique_drivers_set": set(),
                    "unique_drivers": 0,
                    "fastest_lap_awards": 0,
                    "best_lap_ms": None,
                    "best_lap": None,
                    "best_lap_driver": None,
                    "best_lap_public_id": None,
                    "last_seen": None,
                },
            )

            entry["races"] += 1
            entry["unique_drivers_set"].add(result.get("player_id"))
            if race.get("finished_at") and (
                not entry["last_seen"] or race["finished_at"] > entry["last_seen"]
            ):
                entry["last_seen"] = race["finished_at"]

            position = result.get("position")
            if isinstance(position, int):
                entry["average_finish_sum"] += position
                entry["average_finish"] = round(entry["average_finish_sum"] / entry["races"], 2)
                if position == 1:
                    entry["wins"] += 1
                if position <= 3:
                    entry["podiums"] += 1

            if result.get("had_best_lap"):
                entry["fastest_lap_awards"] += 1

            best_lap_ms = result.get("best_lap_ms")
            if isinstance(best_lap_ms, int) and best_lap_ms > 0:
                current_best = entry["best_lap_ms"]
                if current_best is None or best_lap_ms < current_best:
                    entry["best_lap_ms"] = best_lap_ms
                    entry["best_lap"] = result.get("best_lap")
                    entry["best_lap_driver"] = result.get("driver")
                    entry["best_lap_public_id"] = result.get("public_id")

    output = []
    for entry in cars.values():
        races_count = entry["races"]
        entry["win_rate"] = round((entry["wins"] / races_count) * 100, 2) if races_count else 0
        entry["unique_drivers"] = len([player_id for player_id in entry["unique_drivers_set"] if player_id])
        entry.pop("unique_drivers_set", None)
        entry.pop("average_finish_sum", None)
        output.append(entry)

    output.sort(
        key=lambda row: (
            -row["wins"],
            -row["podiums"],
            -row["races"],
            row["average_finish"] if row["average_finish"] is not None else 9999,
            row["car_name"],
        )
    )
    return output


def get_today_stats(state: dict):
    today_str = date.today().isoformat()
    return state.get("daily_by_day", {}).get(today_str, create_daily_stats_container(today_str))


def build_global_stats_output(state: dict):
    daily_stats = get_today_stats(state)

    unique_players_today = len(daily_stats["unique_players_set"])
    tracks_raced_today = sorted(daily_stats["tracks_raced_today_set"])

    most_active_driver = None
    if daily_stats["driver_races_today"]:
        most_active_id = max(
            daily_stats["driver_races_today"].keys(),
            key=lambda player_id: daily_stats["driver_races_today"][player_id],
        )
        driver_name = state["drivers"].get(most_active_id, {}).get("driver")
        most_active_driver = {
            "player_id": most_active_id,
            "public_id": state["drivers"].get(most_active_id, {}).get("public_id"),
            "driver": driver_name,
            "races": daily_stats["driver_races_today"][most_active_id],
        }

    most_successful_driver = None
    if daily_stats["driver_points_today"]:
        most_successful_driver = max(
            daily_stats["driver_points_today"].values(),
            key=lambda row: (row["points"], row["driver"].lower()),
        )

    avg_players_per_race = 0
    if daily_stats["races_today"] > 0:
        avg_players_per_race = round(
            daily_stats["race_participants_total"] / daily_stats["races_today"],
            2,
        )

    return {
        "date": daily_stats["date"],
        "unique_players_today": unique_players_today,
        "races_today": daily_stats["races_today"],
        "sessions_today": daily_stats["sessions_today"],
        "points_earned_today": daily_stats["points_earned_today"],
        "wins_today": daily_stats["wins_today"],
        "podiums_today": daily_stats["podiums_today"],
        "avg_players_per_race_today": avg_players_per_race,
        "tracks_raced_today": tracks_raced_today,
        "best_lap_today": {
            "lap": daily_stats["best_lap_today"],
            "lap_ms": daily_stats["best_lap_today_ms"],
            "driver": daily_stats["best_lap_today_driver"],
            "player_id": daily_stats["best_lap_today_player_id"],
            "public_id": make_public_driver_id(daily_stats["best_lap_today_player_id"]),
            "track": daily_stats["best_lap_today_track"],
            "car_model_id": daily_stats.get("best_lap_today_car_model_id"),
            "car_name_raw": daily_stats.get("best_lap_today_car_name_raw"),
            "car_name": daily_stats.get("best_lap_today_car_name"),
            "session_type": daily_stats["best_lap_today_session_type"],
        },
        "most_active_driver_today": most_active_driver,
        "most_successful_driver_today": most_successful_driver,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
    }


def build_v2_race_detail_filename(race_id) -> str:
    base_name = str(race_id or "unknown").strip().lower()
    if base_name.endswith(".json"):
        base_name = base_name[:-5]
    safe_race_id = re.sub(r"[^a-z0-9._-]+", "_", base_name).strip("._-") or "unknown"
    return f"{safe_race_id}.json"


def build_v2_race_detail_path(race: dict) -> str:
    return f"races/details/{build_v2_race_detail_filename(race.get('race_id') or race.get('source_file'))}"


def build_v2_race_summary_row(race: dict) -> dict:
    winner_result = next(
        (
            row
            for row in (race.get("results") or [])
            if row.get("position") == 1
            or (race.get("winner_public_id") and row.get("public_id") == race.get("winner_public_id"))
        ),
        {},
    )
    return {
        "race_id": race.get("race_id"),
        "source_file": race.get("source_file"),
        "result_source": race.get("result_source"),
        "result_source_label": race.get("result_source_label"),
        "race_type": race.get("race_type"),
        "date": race.get("date"),
        "finished_at": race.get("finished_at"),
        "track": race.get("track"),
        "session_type": race.get("session_type"),
        "server_name": race.get("server_name"),
        "meta_data": race.get("meta_data"),
        "participants_count": race.get("participants_count"),
        "scoring_participants_count": race.get("scoring_participants_count"),
        "points_multiplier": race.get("points_multiplier"),
        "points_rule": race.get("points_rule"),
        "winner": race.get("winner"),
        "winner_public_id": race.get("winner_public_id"),
        "winner_player_id": winner_result.get("player_id"),
        "winner_car_model_id": winner_result.get("car_model_id"),
        "winner_car_name_raw": winner_result.get("car_name_raw"),
        "winner_car_name": winner_result.get("car_name"),
        "best_lap": race.get("best_lap"),
        "best_lap_driver": race.get("best_lap_driver"),
        "best_lap_public_id": race.get("best_lap_public_id"),
        "best_lap_car_model_id": race.get("best_lap_car_model_id"),
        "best_lap_car_name_raw": race.get("best_lap_car_name_raw"),
        "best_lap_car_name": race.get("best_lap_car_name"),
        "total_penalties": race.get("total_penalties"),
        "details_path": build_v2_race_detail_path(race),
    }


def is_v2_hourly_race(race: dict) -> bool:
    source_text = " ".join(
        str(value or "")
        for value in (
            race.get("result_source"),
            race.get("race_type"),
            race.get("source_file"),
            race.get("server_name"),
            race.get("meta_data"),
        )
    ).lower()
    return "hourly" in source_text


def build_v2_races_summary(races: list[dict]) -> dict:
    total_races = len(races)
    active_drivers_total = 0
    overtakes_total = 0
    winner_counts = {}

    for race in races:
        for result in race.get("results") or []:
            if not result.get("counted_for_stats", True):
                continue
            active_drivers_total += 1
            delta = result.get("positions_delta")
            if isinstance(delta, (int, float)):
                overtakes_total += max(0, delta)

        if race.get("winner"):
            key = race.get("winner_public_id") or race.get("winner")
            entry = winner_counts.setdefault(
                key,
                {
                    "name": race.get("winner"),
                    "public_id": race.get("winner_public_id"),
                    "count": 0,
                },
            )
            entry["count"] += 1

    top_winner = (
        sorted(
            winner_counts.values(),
            key=lambda item: (-item["count"], str(item.get("name") or "")),
        )[0]
        if winner_counts
        else None
    )
    latest_race = races[0] if races else None

    return {
        "total_races": total_races,
        "average_active_drivers": round(active_drivers_total / total_races, 2) if total_races else 0,
        "average_overtakes": round(overtakes_total / total_races, 2) if total_races else 0,
        "top_winner": top_winner,
        "latest_race": build_v2_race_summary_row(latest_race) if latest_race else None,
    }


def normalize_v2_activity_score(value, max_value):
    if not isinstance(value, (int, float)) or value <= 0:
        return 0
    safe_max = max(1, max_value if isinstance(max_value, (int, float)) else 1)
    return round((value / safe_max) * 100)


def build_v2_race_activity(races: list[dict]) -> list[dict]:
    day_map = {}

    for race in races:
        finished_at = race.get("finished_at")
        if not finished_at:
            continue

        day_key = str(finished_at)[:10]
        hour_key = "00"
        match = re.search(r"T(\d{2})", str(finished_at))
        if match:
            hour_key = match.group(1)

        participants = race.get("results") or []
        participants_count = race.get("participants_count") if isinstance(race.get("participants_count"), int) else len(participants)

        day = day_map.setdefault(
            day_key,
            {
                "date": day_key,
                "races": 0,
                "entries": 0,
                "unique_players": set(),
                "tracks": set(),
                "hours": {},
            },
        )
        day["races"] += 1
        day["entries"] += participants_count
        if race.get("track"):
            day["tracks"].add(race.get("track"))

        hour = day["hours"].setdefault(
            hour_key,
            {
                "hour": hour_key,
                "label": f"{hour_key}:00",
                "races": 0,
                "entries": 0,
                "unique_players": set(),
            },
        )
        hour["races"] += 1
        hour["entries"] += participants_count

        for result in participants:
            player_id = result.get("player_id")
            if not player_id:
                continue
            day["unique_players"].add(player_id)
            hour["unique_players"].add(player_id)

    day_entries = list(day_map.values())
    max_day_races = max([day["races"] for day in day_entries] or [1])
    max_day_entries = max([day["entries"] for day in day_entries] or [1])
    max_day_unique = max([len(day["unique_players"]) for day in day_entries] or [1])
    all_hours = [hour for day in day_entries for hour in day["hours"].values()]
    max_hour_races = max([hour["races"] for hour in all_hours] or [1])
    max_hour_entries = max([hour["entries"] for hour in all_hours] or [1])
    max_hour_unique = max([len(hour["unique_players"]) for hour in all_hours] or [1])

    output = []
    for day in sorted(day_entries, key=lambda item: item["date"], reverse=True):
        normalized_races = normalize_v2_activity_score(day["races"], max_day_races)
        normalized_entries = normalize_v2_activity_score(day["entries"], max_day_entries)
        normalized_unique = normalize_v2_activity_score(len(day["unique_players"]), max_day_unique)
        activity_score = round(normalized_unique * 0.45 + normalized_entries * 0.4 + normalized_races * 0.15)

        hours = []
        for index in range(24):
            key = f"{index:02d}"
            bucket = day["hours"].get(
                key,
                {
                    "hour": key,
                    "label": f"{key}:00",
                    "races": 0,
                    "entries": 0,
                    "unique_players": set(),
                },
            )
            normalized_hour_races = normalize_v2_activity_score(bucket["races"], max_hour_races)
            normalized_hour_entries = normalize_v2_activity_score(bucket["entries"], max_hour_entries)
            normalized_hour_unique = normalize_v2_activity_score(len(bucket["unique_players"]), max_hour_unique)
            hour_score = round(normalized_hour_unique * 0.5 + normalized_hour_entries * 0.35 + normalized_hour_races * 0.15)
            hours.append(
                {
                    "hour": key,
                    "label": bucket["label"],
                    "races": bucket["races"],
                    "entries": bucket["entries"],
                    "unique_players": len(bucket["unique_players"]),
                    "activity_score": hour_score,
                }
            )

        peak_hour = (
            sorted(
                hours,
                key=lambda item: (
                    -item["activity_score"],
                    -item["entries"],
                    -item["unique_players"],
                    -item["races"],
                    item["hour"],
                ),
            )[0]
            if hours
            else None
        )

        output.append(
            {
                "date": day["date"],
                "races": day["races"],
                "entries": day["entries"],
                "unique_players": len(day["unique_players"]),
                "avg_players_per_race": round(day["entries"] / day["races"], 2) if day["races"] else 0,
                "activity_score": activity_score,
                "tracks": sorted(day["tracks"]),
                "peak_hour": peak_hour if peak_hour and peak_hour["activity_score"] > 0 else None,
                "hours": hours,
            }
        )

    return output


def build_v2_race_page_payload(race_summaries: list[dict], page: int, summary: dict) -> dict:
    total_items = len(race_summaries)
    total_pages = max(1, math.ceil(total_items / V2_RACE_PAGE_SIZE))
    safe_page = min(max(1, page), total_pages)
    start = (safe_page - 1) * V2_RACE_PAGE_SIZE
    end = start + V2_RACE_PAGE_SIZE

    return {
        "schema_version": V2_SCHEMA_VERSION,
        "page": safe_page,
        "page_size": V2_RACE_PAGE_SIZE,
        "total_pages": total_pages,
        "total_items": total_items,
        "start_index": start + 1 if total_items else 0,
        "end_index": min(end, total_items),
        "summary": summary,
        "items": race_summaries[start:end],
    }


def build_v2_table_payload(generated_at: str, items: list[dict]) -> dict:
    return {
        "schema_version": V2_SCHEMA_VERSION,
        "generated_at": generated_at,
        "total_items": len(items),
        "items": items,
    }


def build_v2_table_meta(items: list[dict], path: str) -> dict:
    return {
        "total_items": len(items),
        "preview_items": min(len(items), V2_HOME_TABLE_PREVIEW_LIMIT),
        "full": path,
    }


def build_v2_home_payload(snapshot: dict, races_output: list[dict], races_summary: dict) -> dict:
    latest_hourly_race = next((race for race in races_output if is_v2_hourly_race(race)), None)
    leaderboard = snapshot.get("leaderboard", [])
    bestlaps = snapshot.get("bestlaps", [])
    safety = snapshot.get("safety", [])
    return {
        "schema_version": V2_SCHEMA_VERSION,
        "generated_at": snapshot.get("generated_at"),
        "leaderboard": leaderboard[:V2_HOME_TABLE_PREVIEW_LIMIT],
        "bestlaps": bestlaps[:V2_HOME_TABLE_PREVIEW_LIMIT],
        "safety": safety[:V2_HOME_TABLE_PREVIEW_LIMIT],
        "online": snapshot.get("online", []),
        "global_stats": snapshot.get("global_stats"),
        "driver_of_the_day": snapshot.get("driver_of_the_day"),
        "server_status": snapshot.get("server_status"),
        "race_activity": build_v2_race_activity(races_output),
        "races_summary": races_summary,
        "latest_hourly_race": build_v2_race_summary_row(latest_hourly_race) if latest_hourly_race else None,
        "tables": {
            "leaderboard": build_v2_table_meta(leaderboard, "tables/leaderboard.json"),
            "bestlaps": build_v2_table_meta(bestlaps, "tables/bestlaps.json"),
            "safety": build_v2_table_meta(safety, "tables/safety.json"),
        },
    }


def save_top_v2_outputs(snapshot: dict, races_output: list[dict], changed_files: list[str]):
    generated_at = snapshot.get("generated_at") or datetime.now().isoformat(timespec="seconds")
    version = hashlib.sha1(generated_at.encode("utf-8")).hexdigest()[:12]
    race_summaries = [build_v2_race_summary_row(race) for race in races_output]
    races_summary = build_v2_races_summary(races_output)

    home_payload = build_v2_home_payload(snapshot, races_output, races_summary)
    leaderboard = snapshot.get("leaderboard", [])
    bestlaps = snapshot.get("bestlaps", [])
    safety = snapshot.get("safety", [])
    races_summary_payload = {
        "schema_version": V2_SCHEMA_VERSION,
        "generated_at": generated_at,
        "summary": races_summary,
    }
    manifest_payload = {
        "schema_version": V2_SCHEMA_VERSION,
        "generated_at": generated_at,
        "version": version,
        "home": "home.json",
        "overlay": "overlay.json",
        "races": {
            "summary": "races/summary.json",
            "page_path": "races/page-{page}.json",
            "details_path": "races/details/{race_id}.json",
            "page_size": V2_RACE_PAGE_SIZE,
            "total_items": len(race_summaries),
            "total_pages": max(1, math.ceil(len(race_summaries) / V2_RACE_PAGE_SIZE)),
        },
        "tables": {
            "leaderboard": build_v2_table_meta(leaderboard, "tables/leaderboard.json"),
            "bestlaps": build_v2_table_meta(bestlaps, "tables/bestlaps.json"),
            "safety": build_v2_table_meta(safety, "tables/safety.json"),
        },
    }
    overlay_payload = {
        "schema_version": V2_SCHEMA_VERSION,
        "generated_at": generated_at,
        "leaderboard": snapshot.get("leaderboard", [])[:100],
        "bestlaps": snapshot.get("bestlaps", [])[:10],
    }

    if save_json_if_changed(V2_HOME_FILE, home_payload):
        changed_files.append("v2/home.json")
    if save_json_if_changed(V2_OVERLAY_FILE, overlay_payload):
        changed_files.append("v2/overlay.json")
    if save_json_if_changed(V2_RACES_SUMMARY_FILE, races_summary_payload):
        changed_files.append("v2/races/summary.json")
    if save_json_if_changed(V2_MANIFEST_FILE, manifest_payload):
        changed_files.append("v2/manifest.json")
    if save_json_if_changed(V2_LEADERBOARD_FILE, build_v2_table_payload(generated_at, leaderboard)):
        changed_files.append("v2/tables/leaderboard.json")
    if save_json_if_changed(V2_BESTLAPS_FILE, build_v2_table_payload(generated_at, bestlaps)):
        changed_files.append("v2/tables/bestlaps.json")
    if save_json_if_changed(V2_SAFETY_FILE, build_v2_table_payload(generated_at, safety)):
        changed_files.append("v2/tables/safety.json")

    for page in range(1, manifest_payload["races"]["total_pages"] + 1):
        page_payload = build_v2_race_page_payload(race_summaries, page, races_summary)
        page_path = V2_RACES_DIR / f"page-{page}.json"
        if save_json_if_changed(page_path, page_payload):
            changed_files.append(f"v2/races/page-{page}.json")

    for race in races_output:
        detail_filename = build_v2_race_detail_filename(race.get("race_id") or race.get("source_file"))
        detail_path = V2_RACE_DETAILS_DIR / detail_filename
        if save_json_if_changed(detail_path, race):
            changed_files.append(f"v2/races/details/{detail_filename}")


def build_driver_of_the_day_output(state: dict):
    daily_stats = get_today_stats(state)
    drivers = list(daily_stats["driver_day_stats"].values())
    updated_at = datetime.now().isoformat(timespec="seconds")

    if not drivers:
        return {
            "date": daily_stats["date"],
            "driver": None,
            "player_id": None,
            "public_id": None,
            "points": 0,
            "races": 0,
            "wins": 0,
            "average_finish": None,
            "average_positions_delta": None,
            "positions_delta_races": 0,
            "best_lap": None,
            "best_lap_ms": None,
            "best_lap_track": None,
            "best_lap_car_model_id": None,
            "best_lap_car_name_raw": None,
            "best_lap_car_name": None,
            "updated_at": updated_at,
        }

    winner = max(
        drivers,
        key=lambda row: (
            row["points"],
            row["wins"],
            -(row["average_finish"] if row["average_finish"] is not None else 9999),
            row["races"],
            -(row["best_lap_ms"] if row["best_lap_ms"] is not None else 10**12),
            row["driver"].lower() if row["driver"] else "",
        ),
    )

    return {
        "date": daily_stats["date"],
        "driver": winner["driver"],
        "player_id": winner["player_id"],
        "public_id": winner.get("public_id"),
        "points": winner["points"],
        "races": winner["races"],
        "wins": winner["wins"],
        "average_finish": winner["average_finish"],
        "average_positions_delta": winner.get("average_positions_delta"),
        "positions_delta_races": winner.get("positions_delta_races", 0),
        "best_lap": winner["best_lap"],
        "best_lap_ms": winner["best_lap_ms"],
        "best_lap_track": winner["best_lap_track"],
        "best_lap_car_model_id": winner.get("best_lap_car_model_id"),
        "best_lap_car_name_raw": winner.get("best_lap_car_name_raw"),
        "best_lap_car_name": winner.get("best_lap_car_name"),
        "updated_at": updated_at,
    }


def build_snapshot(state: dict, server_status: dict):
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "leaderboard": build_leaderboard_output(state["drivers"]),
        "bestlaps": build_bestlaps_output(state["drivers"]),
        "safety": build_safety_output(state["safety"]),
        "online": build_online_output(state["online_by_day"]),
        "global_stats": build_global_stats_output(state),
        "driver_of_the_day": build_driver_of_the_day_output(state),
        "server_status": server_status,
    }


def run_git(args):
    if not GIT_EXE:
        raise FileNotFoundError("Git executable is not configured.")

    result = subprocess.run(
        [GIT_EXE] + args,
        cwd=str(OUTPUT_DIR),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return result


def git_publish_if_needed(changed_files):
    if not AUTO_GIT_PUSH:
        logging.info("AUTO_GIT_PUSH=False, skipping publish.")
        return

    if not changed_files:
        logging.info("No output changes detected. git push is not required.")
        return

    if not GIT_EXE:
        logging.warning("Skipping git publish because Git executable was not found.")
        return

    logging.info("Publishing updated snapshot to Git...")

    add_result = run_git(["add", "-A", "."])
    if add_result.returncode != 0:
        logging.error("git add failed:\n%s\n%s", add_result.stdout, add_result.stderr)
        return

    status_result = run_git(["status", "--porcelain"])
    if status_result.returncode != 0:
        logging.error("git status failed:\n%s\n%s", status_result.stdout, status_result.stderr)
        return

    if not status_result.stdout.strip():
        logging.info("Git sees no staged changes after add.")
        return

    commit_message = f"{COMMIT_MESSAGE_PREFIX} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    commit_result = run_git(["commit", "-m", commit_message])
    if commit_result.returncode != 0:
        combined = (commit_result.stdout + "\n" + commit_result.stderr).lower()
        if "nothing to commit" in combined:
            logging.info("Nothing to commit.")
            return

        logging.error("git commit failed:\n%s\n%s", commit_result.stdout, commit_result.stderr)
        return

    push_result = run_git(["push"])
    if push_result.returncode != 0:
        logging.error("git push failed:\n%s\n%s", push_result.stdout, push_result.stderr)
        return

    logging.info("GitHub Pages update pushed successfully.")


def discover_processing_plan(state: dict):
    result_files = collect_result_files()
    current_files = {get_relative_result_path(path): path for path in result_files}
    current_signatures = {rel_path: get_file_signature(path) for rel_path, path in current_files.items()}
    known_signatures = state.get("processed_files", {})

    missing_files = sorted(set(known_signatures) - set(current_signatures))
    changed_files = sorted(
        rel_path
        for rel_path, signature in known_signatures.items()
        if rel_path in current_signatures and current_signatures[rel_path] != signature
    )

    full_rebuild = bool(missing_files or changed_files)
    if full_rebuild:
        if missing_files:
            logging.info("Full rebuild required. Removed processed files: %s", ", ".join(missing_files))
        if changed_files:
            logging.info("Full rebuild required. Changed processed files: %s", ", ".join(changed_files))
        return {
            "mode": "full_rebuild",
            "files": result_files,
            "signatures": current_signatures,
        }

    new_files = [current_files[rel_path] for rel_path in sorted(current_files.keys()) if rel_path not in known_signatures]
    return {
        "mode": "incremental",
        "files": new_files,
        "signatures": current_signatures,
    }


def rebuild_all():
    if not RESULTS_DIR.exists():
        logging.error("Results folder not found. Aborting rebuild to avoid publishing empty data: %s", RESULTS_DIR)
        return

    state = load_state()
    plan = discover_processing_plan(state)
    processing_mode = plan["mode"]
    files_to_process = plan["files"]
    signatures = plan["signatures"]

    if processing_mode == "full_rebuild":
        state = create_state()
        logging.info("Starting full rebuild from %s result files.", len(files_to_process))
    else:
        logging.info("Starting incremental update from %s new result files.", len(files_to_process))

    for file_path in files_to_process:
        logging.info("Processing %s", file_path.name)
        process_file(file_path, state)
        rel_path = get_relative_result_path(file_path)
        state["processed_files"][rel_path] = signatures[rel_path]

    if processing_mode == "full_rebuild":
        state["processed_files"] = dict(sorted(signatures.items()))

    save_state(state)

    server_status = build_server_status_output()
    snapshot = build_snapshot(state, server_status)
    races_output = build_races_output(state["races"])
    cars_output = build_cars_output(state["races"])
    drivers_index, driver_profiles = build_drivers_index(state)

    changed_files = []
    save_server_status_output(server_status, changed_files)
    if save_json_if_changed(SNAPSHOT_FILE, snapshot):
        changed_files.append("snapshot.json")
    if save_json_if_changed(RACES_FILE, races_output):
        changed_files.append("races/races.json")
    if save_json_if_changed(CARS_FILE, cars_output):
        changed_files.append("cars/cars.json")
    if save_json_if_changed(DRIVERS_INDEX_FILE, drivers_index):
        changed_files.append("drivers/drivers.json")
    for public_id, profile in driver_profiles.items():
        profile_path = DRIVERS_DIR / f"{public_id}.json"
        if save_json_if_changed(profile_path, profile):
            changed_files.append(f"drivers/{public_id}.json")
    save_top_v2_outputs(snapshot, races_output, changed_files)

    logging.info("Drivers in leaderboard: %s", len(snapshot["leaderboard"]))
    logging.info("Drivers in bestlaps: %s", len(snapshot["bestlaps"]))
    logging.info("Races in archive: %s", len(races_output))
    logging.info("Cars in archive: %s", len(cars_output))
    logging.info("Driver profiles: %s", len(driver_profiles))
    logging.info("Safety rows: %s", len(snapshot["safety"]))
    logging.info("Online day rows: %s", len(snapshot["online"]))
    logging.info("Server status: %s (%s players)", server_status["status"], server_status["players_online"])
    logging.info("Changed public files: %s", changed_files if changed_files else "none")

    git_publish_if_needed(changed_files)


if __name__ == "__main__":
    configure_logging()
    rebuild_all()
