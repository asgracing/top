"""Cutover guards over a fake API; no external requests or credentials."""
import importlib.util
import json
import tempfile
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

source = Path(__file__).resolve().parents[2] / 'scripts/site-edge-release.py'
spec = importlib.util.spec_from_file_location('site_edge_release', source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeRelease(module.EdgeRelease):
    def __init__(self, folder):
        super().__init__('fixture-only', Path(folder) / 'state.json')
        original = {'id': 'dns-main', 'name': 'asgracing.ru', 'type': 'CNAME', 'content': 'asgracing.github.io', 'proxied': False}
        self.state = {'status': 'staged-disabled', 'version': 'accepted', 'rules': [{'scope': '/zones/test', 'rulesetId': 'rules', 'id': 'own', 'definition': {'ref': 'asg_v2_fixture', 'action': 'redirect', 'expression': 'true', 'enabled': False}}], 'before': {'zonePath': '/zones/test', 'dns': [original]}, 'dnsChanged': []}
        self.current = dict(original)
        self.calls = []
        self.verified = []
        self.fail_dns = False

    def verify(self, enabled):
        self.verified.append(enabled)

    def api(self, method, path, body=None, **kwargs):
        self.calls.append((method, path, body))
        if method == 'GET':
            return dict(self.current)
        if '/dns_records/' in path:
            if self.fail_dns and body['proxied']:
                raise RuntimeError('fixture DNS write failure')
            self.current.update(body)
        return {}


class CutoverTests(unittest.TestCase):
    def test_origin_uses_public_metadata_and_rejects_other_candidate(self):
        version = json.loads((source.parents[1] / 'site-release.json').read_text(encoding='utf-8'))['version']
        session = Mock()
        session.get.return_value.json.return_value = {'siteLayout': 'root-release-candidate', 'sourceSnapshotSha256': 'other'}
        with patch.object(module.requests, 'Session', return_value=session):
            with self.assertRaises(RuntimeError):
                module.origin_check(version)
        self.assertEqual(session.get.call_count, 1)
        self.assertEqual(session.get.call_args.args[0], 'https://asgracing.ru/build-meta.json')

    def test_dns_scope_excludes_api_and_changed_origin(self):
        for record in [{'name': 'api.asgracing.ru', 'type': 'CNAME', 'content': 'asgracing.github.io'}, {'name': 'asgracing.ru', 'type': 'CNAME', 'content': 'other.example'}]:
            with self.assertRaises(RuntimeError):
                module.allowed_dns(record)

    def test_unpublished_candidate_cannot_enable_rules_or_proxy(self):
        with tempfile.TemporaryDirectory() as folder:
            release = FakeRelease(folder)
            def missing(_):
                raise RuntimeError('not published')
            with self.assertRaises(RuntimeError):
                release.activate('accepted', missing)
            self.assertEqual(release.calls, [])

    def test_activation_changes_only_owned_rule_and_proxy_flag(self):
        with tempfile.TemporaryDirectory() as folder:
            release = FakeRelease(folder)
            release.activate('accepted', lambda _: None)
            self.assertEqual(release.state['status'], 'active')
            writes = [call for call in release.calls if call[0] == 'PATCH']
            self.assertEqual([call[1] for call in writes], ['/zones/test/rulesets/rules/rules/own', '/zones/test/dns_records/dns-main'])
            self.assertEqual(writes[-1][2], {'proxied': True})
            self.assertEqual(release.verified, [False, True])

    def test_failed_dns_write_restores_owned_rules_and_original_proxy(self):
        with tempfile.TemporaryDirectory() as folder:
            release = FakeRelease(folder)
            release.fail_dns = True
            with self.assertRaises(RuntimeError):
                release.activate('accepted', lambda _: None)
            self.assertEqual(release.state['status'], 'rolled-back-disabled')
            self.assertEqual(release.current['proxied'], False)
            patches = [call for call in release.calls if '/rulesets/' in call[1]]
            self.assertEqual([call[2]['enabled'] for call in patches], [True, False])

    def test_mismatched_version_cannot_cut_over(self):
        with tempfile.TemporaryDirectory() as folder:
            release = FakeRelease(folder)
            with self.assertRaises(RuntimeError):
                release.activate('other', lambda _: None)
            self.assertEqual(release.calls, [])


if __name__ == '__main__':
    unittest.main()
