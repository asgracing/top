import importlib.util
import logging
import os
import sys
import time
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
PARSER_PATH = SCRIPT_DIR / "parser.py"
ENV_RESULTS_POLL_INTERVAL_SECONDS = "ACC_RESULTS_WATCH_INTERVAL_SECONDS"
ENV_IDLE_LOG_INTERVAL_SECONDS = "ACC_WATCHER_IDLE_LOG_INTERVAL_SECONDS"


def load_parser_module():
    spec = importlib.util.spec_from_file_location("asg_top_stats_parser", PARSER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load parser module from {PARSER_PATH}")

    module = importlib.util.module_from_spec(spec)
    sys.modules.setdefault("asg_top_stats_parser", module)
    spec.loader.exec_module(module)
    return module


stats_parser = load_parser_module()


def env_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default

    try:
        value = int(raw)
    except ValueError:
        return default

    return max(minimum, value)


def should_rebuild(plan: dict) -> bool:
    if plan.get("mode") == "full_rebuild":
        return True
    return bool(plan.get("files"))


def run_results_rebuild_if_needed() -> bool:
    known_signatures = stats_parser.load_processed_file_signatures()
    plan = stats_parser.discover_processing_plan_from_signatures(known_signatures)
    if not should_rebuild(plan):
        return False

    logging.info(
        "Result watcher detected %s. Triggering rebuild for %s file(s).",
        plan.get("mode"),
        len(plan.get("files") or []),
    )
    stats_parser.rebuild_all()
    return True


def main():
    stats_parser.configure_logging()

    results_poll_interval = env_int(ENV_RESULTS_POLL_INTERVAL_SECONDS, 60)
    idle_log_interval = env_int(ENV_IDLE_LOG_INTERVAL_SECONDS, 1800)

    logging.info(
        "Top stats supervisor started. results_poll=%ss output_dir=%s results_dir=%s hourly_results_dir=%s",
        results_poll_interval,
        stats_parser.OUTPUT_DIR,
        stats_parser.RESULTS_DIR,
        stats_parser.HOURLY_RESULTS_DIR,
    )

    last_idle_log_at = 0.0

    try:
        while True:
            loop_started_at = time.time()

            try:
                run_results_rebuild_if_needed()
                now = time.time()

                if idle_log_interval > 0 and now - last_idle_log_at >= idle_log_interval:
                    logging.info(
                        "Watcher idle: no new result files detected.",
                    )
                    last_idle_log_at = now

            except Exception as exc:
                logging.exception("Top stats supervisor loop failed: %s", exc)

            elapsed = time.time() - loop_started_at
            sleep_seconds = max(1, results_poll_interval - elapsed)
            time.sleep(sleep_seconds)
    except KeyboardInterrupt:
        logging.info("Top stats supervisor stopped by keyboard interrupt.")


if __name__ == "__main__":
    main()
