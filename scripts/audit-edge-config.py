"""Read-only Cloudflare backup. Never sends POST/PUT/PATCH/DELETE or logs credentials."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import tomllib

import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--use-wrangler', action='store_true')
    args = parser.parse_args()
    token = os.environ.get('CLOUDFLARE_API_TOKEN') or os.environ.get('CF_API_TOKEN')
    if not token and args.use_wrangler:
        config = Path.home() / 'AppData/Roaming/xdg.config/.wrangler/config/default.toml'
        values = tomllib.loads(config.read_text(encoding='utf-8'))
        expires = datetime.datetime.fromisoformat(values['expiration_time'].replace('Z', '+00:00'))
        if expires <= datetime.datetime.now(datetime.timezone.utc):
            raise SystemExit('Saved Wrangler login expired; no API request sent. Refresh login separately.')
        token = values.get('oauth_token')
    if not token:
        raise SystemExit('No current Cloudflare read credential found. Do not send tokens in chat.')
    session = requests.Session()
    session.headers['Authorization'] = 'Bearer ' + token
    failures = []

    def get(path, optional=False, params=None):
        response = session.get('https://api.cloudflare.com/client/v4' + path, params=params, timeout=25)
        payload = response.json()
        if optional and response.status_code == 404:
            return {'present': False}
        if response.status_code != 200 or not payload.get('success'):
            failures.append({'endpoint': path, 'status': response.status_code, 'codes': [e.get('code') for e in payload.get('errors', [])]})
            return {'unavailable': True, 'status': response.status_code}
        return payload

    def pages(path):
        result = []
        for page in range(1, 101):
            payload = get(path, params={'page': page, 'per_page': 100})
            if payload.get('unavailable'):
                return payload
            result.extend(payload['result'])
            if page >= payload.get('result_info', {}).get('total_pages', 1):
                return {'success': True, 'result': result}
        raise RuntimeError('Cloudflare read exceeded bounded pagination')

    def cursor_pages(path):
        result, cursor, seen = [], None, set()
        for _ in range(100):
            params = {'per_page': 100}
            if cursor:
                params['cursor'] = cursor
            payload = get(path, params=params)
            if payload.get('unavailable'):
                return payload
            result.extend(payload['result'])
            cursor = payload.get('result_info', {}).get('cursors', {}).get('after')
            if not cursor:
                return {'success': True, 'result': result}
            if cursor in seen:
                raise RuntimeError('Repeated Cloudflare list cursor; export incomplete')
            seen.add(cursor)
        raise RuntimeError('Cloudflare cursor read exceeded bounded pagination')

    zones = get('/zones', params={'name': 'asgracing.ru', 'per_page': 1})
    if zones.get('unavailable') or len(zones.get('result', [])) != 1:
        raise SystemExit('Zone access unavailable; no settings changed.')
    zone = zones['result'][0]
    zone_id, account_id = zone['id'], zone['account']['id']
    snapshot = {'zone': zones,
                'dns': pages(f'/zones/{zone_id}/dns_records'),
                'page-rules': get(f'/zones/{zone_id}/pagerules'),
                'single-redirects': get(f'/zones/{zone_id}/rulesets/phases/http_request_dynamic_redirect/entrypoint', True),
                'cache-rules': get(f'/zones/{zone_id}/rulesets/phases/http_request_cache_settings/entrypoint', True),
                'bulk-rules': get(f'/accounts/{account_id}/rulesets/phases/http_request_redirect/entrypoint', True),
                'lists': get(f'/accounts/{account_id}/rules/lists')}
    for setting in ['ssl', 'always_use_https', 'browser_cache_ttl']:
        snapshot[setting] = get(f'/zones/{zone_id}/settings/{setting}')
    for item in snapshot['lists'].get('result', []):
        if item.get('kind') == 'redirect':
            snapshot['list-' + item['id']] = cursor_pages(f'/accounts/{account_id}/rules/lists/{item["id"]}/items')
    now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace(':', '-').replace('.', '-')
    workspace = Path(__file__).resolve().parents[2]
    directory = workspace / 'tmp/v2-edge-backups' / now
    directory.mkdir(parents=True, exist_ok=False)
    inventory = []
    for name, payload in snapshot.items():
        data = (json.dumps(payload, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        (directory / (name + '.json')).write_bytes(data)
        inventory.append({'file': name + '.json', 'sha256': hashlib.sha256(data).hexdigest()})
    report = {'status': 'incomplete-read-access' if failures else 'read-backup-complete',
              'files': inventory, 'failures': failures, 'settingsChanged': False,
              'dns': [{k: r.get(k) for k in ['name', 'type', 'proxied']} for r in snapshot['dns'].get('result', []) if r['name'] in ['asgracing.ru', 'www.asgracing.ru']],
              'plan': zone.get('plan', {}).get('name'),
              'singleRules': None if snapshot['single-redirects'].get('unavailable') else len(snapshot['single-redirects'].get('result', {}).get('rules', [])),
              'bulkRules': None if snapshot['bulk-rules'].get('unavailable') else len(snapshot['bulk-rules'].get('result', {}).get('rules', []))}
    (directory / 'inventory.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': report['status'], 'backup_directory': str(directory), 'files': len(inventory), 'settingsChanged': False}))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
