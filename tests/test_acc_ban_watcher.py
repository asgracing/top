import importlib.util
from pathlib import Path
import unittest
from unittest import mock


MODULE_PATH = Path(__file__).resolve().parents[1] / "stats_tool" / "acc_ban_watcher.py"
SPEC = importlib.util.spec_from_file_location("asg_acc_ban_watcher_test", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
ban_watcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ban_watcher)


class BanWatcherRecoveryTests(unittest.TestCase):
    def watcher(self):
        watcher = ban_watcher.AccBanWatcher.__new__(ban_watcher.AccBanWatcher)
        watcher.log_file = mock.Mock()
        watcher.write_entrylist = mock.Mock()
        watcher.write_live_state = mock.Mock()
        watcher.process_text = mock.Mock(return_value="")
        return watcher

    def test_transient_file_error_is_retried_with_backoff(self):
        watcher = self.watcher()
        watcher.log_file.exists.return_value = True
        watcher.log_file.stat.side_effect = [OSError("temporary lock"), KeyboardInterrupt]
        with mock.patch.object(ban_watcher.time, "sleep") as sleep, mock.patch.object(
            ban_watcher.logging, "exception"
        ) as logged:
            with self.assertRaises(KeyboardInterrupt):
                watcher.follow(1.0, from_start=True)
        sleep.assert_called_once_with(1.0)
        logged.assert_called_once()

    def test_replay_once_remains_fail_fast(self):
        watcher = self.watcher()
        watcher.log_file.exists.return_value = True
        watcher.log_file.stat.side_effect = OSError("broken replay source")
        with mock.patch.object(ban_watcher.time, "sleep") as sleep:
            with self.assertRaisesRegex(OSError, "broken replay source"):
                watcher.follow(1.0, from_start=True, replay_once=True)
        sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
