"""Authorized ASG site cutover; staged rules stay disabled until origin verification.

Credentials arrive through process environment. State/backups are outside top.
Never replaces existing rulesets, changes API subdomains, or logs credentials.
"""
import argparse
import copy
import datetime
import hashlib
import json
import os
from pathlib import Path
import time

import requests

WORKSPACE = Path(__file__).resolve().parents[2]
STATE = WORKSPACE / 'tmp/v2-edge-release-state.json'
PLAN = WORKSPACE / 'tmp/v2-edge-preparation/edge-plan-301.json'
HOSTS = {'asgracing.ru', 'www.asgracing.ru'}
FIELDS = ('ref', 'description', 'action', 'expression', 'action_parameters', 'enabled')


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def rule_body(rule, enabled):
    result = {key: copy.deepcopy(rule[key]) for key in FIELDS if key in rule}
    result['enabled'] = enabled
    return result


def allowed_dns(record):
    if record.get('name') not in HOSTS or record.get('type') != 'CNAME' or record.get('content', '').rstrip('.') != 'asgracing.github.io':
        raise RuntimeError('Unexpected origin DNS; cutover stopped')


class EdgeRelease:
    def __init__(self, token, state_path=STATE):
        self.session = requests.Session()
        self.session.headers['Authorization'] = 'Bearer ' + token
        self.state_path = state_path
        self.state = json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else None

    def api(self, method, path, body=None, params=None, optional=False):
        response = self.session.request(method, 'https://api.cloudflare.com/client/v4' + path, json=body, params=params, timeout=25)
        if optional and response.status_code == 404:
            return None
        payload = response.json()
        if not response.ok or not payload.get('success'):
            errors = [{'code': e.get('code'), 'message': str(e.get('message', ''))[:700]} for e in payload.get('errors', [])]
            raise RuntimeError(json.dumps({'method': method, 'path': path, 'status': response.status_code, 'errors': errors}))
        return payload.get('result')

    def save(self):
        self.state['updatedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        dump(self.state_path, self.state)

    def context(self):
        zones = self.api('GET', '/zones', params={'name': 'asgracing.ru', 'per_page': 1})
        if len(zones) != 1 or zones[0]['status'] != 'active':
            raise RuntimeError('Active ASG zone unavailable')
        zone = zones[0]
        zone_path = '/zones/' + zone['id']
        account_path = '/accounts/' + zone['account']['id']
        dns = self.api('GET', zone_path + '/dns_records', params={'per_page': 100})
        selected = [r for r in dns if r['name'] in HOSTS]
        if {r['name'] for r in selected} != HOSTS or len(selected) != 2:
            raise RuntimeError('ASG origin DNS records unavailable')
        for record in selected:
            allowed_dns(record)
        ssl = self.api('GET', zone_path + '/settings/ssl')
        if ssl['value'] != 'strict':
            raise RuntimeError('Expected Full Strict TLS; no changes made')
        single = self.api('GET', zone_path + '/rulesets/phases/http_request_dynamic_redirect/entrypoint', optional=True)
        bulk = self.api('GET', account_path + '/rulesets/phases/http_request_redirect/entrypoint', optional=True)
        lists = self.api('GET', account_path + '/rules/lists')
        return {'zonePath': zone_path, 'accountPath': account_path, 'dns': selected, 'single': single, 'bulk': bulk, 'lists': lists}

    def add_rules(self, scope, definition):
        existing = self.api('GET', scope + '/rulesets/phases/' + definition['phase'] + '/entrypoint', optional=True)
        rules = [rule_body(r, False) for r in definition['rules']]
        if existing is None:
            result = self.api('POST', scope + '/rulesets', {'name': 'ASG V2 redirects', 'kind': definition['kind'], 'phase': definition['phase'], 'rules': rules})
            ids = {r['ref']: r['id'] for r in result['rules']}
            for rule in rules:
                self.state['rules'].append({'scope': scope, 'rulesetId': result['id'], 'id': ids[rule['ref']], 'definition': rule})
            self.save()
        else:
            if any(r.get('ref') in {n['ref'] for n in rules} for r in existing.get('rules', [])):
                raise RuntimeError('ASG refs already exist outside this journal')
            for rule in rules:
                result = self.api('POST', scope + '/rulesets/' + existing['id'] + '/rules', rule)
                added = next(r for r in result['rules'] if r.get('ref') == rule['ref'])
                self.state['rules'].append({'scope': scope, 'rulesetId': existing['id'], 'id': added['id'], 'definition': rule})
                self.save()

    def stage(self, plan, rows, version):
        if self.state and (self.state.get('rules') or self.state.get('listId')):
            raise RuntimeError('A previous edge journal exists; verify it rather than overwriting')
        current = self.context()
        if len((current['single'] or {}).get('rules', [])) + len(plan['single']['rules']) > 10 or len((current['bulk'] or {}).get('rules', [])) + 1 > 15 or len(current['lists']) + 1 > 5:
            raise RuntimeError('Insufficient rule/list quota')
        if any(x['name'] == plan['listName'] for x in current['lists']):
            raise RuntimeError('Release list name already exists')
        backup = WORKSPACE / 'tmp/v2-edge-cutover-backups' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        dump(backup / 'before.json', current)
        self.state = {'schemaVersion': 1, 'version': version, 'status': 'staging', 'backup': str(backup), 'before': current, 'rules': [], 'listId': None, 'dnsChanged': []}
        self.save()
        # Cloudflare authorization, expression, entitlement and quota validation,
        # with no persistence. Existing rulesets receive only appended rule calls.
        single = current['single']
        scope = current['zonePath']
        if single is None:
            self.api('POST', scope + '/rulesets', {'name': 'ASG V2 redirects', 'kind': 'zone', 'phase': plan['single']['phase'], 'rules': plan['single']['rules']}, params={'dry_run': 'true'})
        else:
            for rule in plan['single']['rules']:
                self.api('POST', scope + '/rulesets/' + single['id'] + '/rules', rule, params={'dry_run': 'true'})
        created = self.api('POST', current['accountPath'] + '/rules/lists', {'name': plan['listName'], 'kind': 'redirect', 'description': 'ASG accepted V2 root release'})
        self.state['listId'] = created['id']
        self.save()
        items = [{'redirect': {'source_url': r['source'], 'target_url': r['target'], 'status_code': r['status'], **{key: r[key] for key in ['preserve_query_string', 'include_subdomains', 'subpath_matching', 'preserve_path_suffix']}}} for r in rows]
        operation = self.api('POST', current['accountPath'] + '/rules/lists/' + created['id'] + '/items', items)
        deadline = time.monotonic() + 90
        while True:
            result = self.api('GET', current['accountPath'] + '/rules/lists/bulk_operations/' + operation['operation_id'])
            if result['status'] == 'completed':
                break
            if result['status'] == 'failed' or time.monotonic() > deadline:
                raise RuntimeError('Bulk list import failed or timed out')
            time.sleep(2)
        self.add_rules(current['zonePath'], plan['single'])
        self.add_rules(current['accountPath'], plan['bulk'])
        self.state['status'] = 'staged-disabled'
        self.save()
        self.verify(False)

    def verify(self, enabled):
        for saved in self.state['rules']:
            result = self.api('GET', saved['scope'] + '/rulesets/' + saved['rulesetId'])
            live = next((r for r in result['rules'] if r['id'] == saved['id']), None)
            if not live or rule_body(live, live.get('enabled', True)) != rule_body(saved['definition'], enabled):
                raise RuntimeError('Release rule differs from the journal')
        result = self.api('GET', self.state['before']['accountPath'] + '/rules/lists/' + self.state['listId'])
        if result['num_items'] != 574:
            raise RuntimeError('Unexpected bulk redirect item count')

    def patch_rule(self, saved, enabled):
        self.api('PATCH', saved['scope'] + '/rulesets/' + saved['rulesetId'] + '/rules/' + saved['id'], rule_body(saved['definition'], enabled))

    def activate(self, version, origin_check):
        if self.state['status'] != 'staged-disabled' or self.state['version'] != version:
            raise RuntimeError('Accepted staged version mismatch')
        self.verify(False)
        origin_check(version)
        self.state['status'] = 'activating'
        self.save()
        try:
            for rule in self.state['rules']:
                self.patch_rule(rule, True)
            for original in self.state['before']['dns']:
                path = self.state['before']['zonePath'] + '/dns_records/' + original['id']
                current = self.api('GET', path)
                allowed_dns(current)
                if current['proxied'] != original['proxied']:
                    raise RuntimeError('DNS changed since staging')
                # Record attempted writes first so an interrupted response is recoverable.
                self.state['dnsChanged'].append(original['id'])
                self.save()
                self.api('PATCH', path, {'proxied': True})
            self.verify(True)
            self.state['status'] = 'active'
            self.save()
        except Exception:
            self.rollback()
            raise

    def rollback(self):
        for rule in self.state['rules']:
            self.patch_rule(rule, False)
        for original in self.state['before']['dns']:
            if original['id'] in self.state['dnsChanged']:
                path = self.state['before']['zonePath'] + '/dns_records/' + original['id']
                allowed_dns(self.api('GET', path))
                self.api('PATCH', path, {'proxied': original['proxied']})
        self.state['status'] = 'rolled-back-disabled'
        self.save()


def origin_check(version):
    root = Path(__file__).resolve().parents[1]
    config = json.loads((root / 'site-release.json').read_text(encoding='utf-8'))
    expected = json.loads((root / 'build-meta.json').read_text(encoding='utf-8'))
    if config.get('layout') != 'root' or config.get('version') != version:
        raise RuntimeError('Local accepted release version does not match')
    session = requests.Session()
    # Publication controls are excluded by Jekyll; use the public asset metadata.
    response = session.get('https://asgracing.ru/build-meta.json', params={'cutover': version}, timeout=20)
    response.raise_for_status()
    published = response.json()
    if published.get('siteLayout') != 'root-release-candidate' or published.get('sourceSnapshotSha256') != expected.get('sourceSnapshotSha256'):
        raise RuntimeError('Accepted site is not yet published at the origin')
    for path, marker in [('/', 'data-site-version="v2"'), ('/en/', 'data-page-language="en"'), ('/old/', 'data-site-version="old"')]:
        result = session.get('https://asgracing.ru' + path, params={'cutover': version}, timeout=20)
        result.raise_for_status()
        if marker not in result.text:
            raise RuntimeError('Published page cutover marker missing: ' + path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', choices=['stage', 'activate', 'verify', 'rollback'], required=True)
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    release = EdgeRelease(os.environ['CLOUDFLARE_API_TOKEN'])
    if args.action == 'stage':
        inventory = json.loads((PLAN.parent / 'inventory.json').read_text(encoding='utf-8'))
        for item in inventory['files']:
            if hashlib.sha256((PLAN.parent / item['file']).read_bytes()).hexdigest() != item['sha256']:
                raise RuntimeError('Prepared edge plan changed since review')
        plan = json.loads(PLAN.read_text(encoding='utf-8'))
        # Export the same bounded manifest used by the model/HTTP release checks.
        import csv
        with (PLAN.parent / 'bulk-redirects-301.csv').open(encoding='utf-8', newline='') as stream:
            rows = [{'source': r[0], 'target': r[1], 'status': int(r[2]), **{key: value == 'true' for key, value in zip(['preserve_query_string', 'include_subdomains', 'subpath_matching', 'preserve_path_suffix'], r[3:])}} for r in csv.reader(stream)]
        if plan['hosts'] != sorted(HOSTS) or len(rows) != 574 or len(plan['single']['rules']) != 8:
            raise RuntimeError('Unexpected ASG edge plan')
        release.stage(plan, rows, args.version)
    elif args.action == 'activate':
        release.activate(args.version, origin_check)
    elif args.action == 'rollback':
        release.rollback()
    else:
        release.verify(release.state['status'] == 'active')
    print(json.dumps({'status': release.state['status'], 'version': release.state['version'], 'rules': len(release.state['rules']), 'dnsChanged': len(release.state['dnsChanged'])}))


if __name__ == '__main__':
    main()
