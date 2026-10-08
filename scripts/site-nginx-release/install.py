#!/usr/bin/python3
"""Isolated root/www nginx release; never changes existing API/data/auth hosts."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import ssl
import subprocess
import time

ROOT = Path(__file__).resolve().parent
VERSION = ROOT.name
if not re.fullmatch(r'site-redirects-\d{8}-r\d+', VERSION):
    raise SystemExit('Unexpected release directory')
JOURNAL = Path('/opt/asg-site/deployment-journal') / (VERSION + '.json')
LINKS = {
    Path('/etc/nginx/conf.d/asg-site-redirect-maps.conf'): ROOT / 'maps.conf',
    Path('/etc/nginx/sites-available/asg-site-front'): ROOT / 'site.conf',
    Path('/etc/nginx/sites-enabled/asg-site-front'): Path('/etc/nginx/sites-available/asg-site-front'),
}

def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, timeout=60, **kwargs)

def save(data):
    JOURNAL.parent.mkdir(parents=True, exist_ok=True)
    data['updatedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    JOURNAL.write_text(json.dumps(data, indent=2) + '\n')

def inventory():
    manifest = json.loads((ROOT / 'inventory.json').read_text())
    for name, digest in manifest['files'].items():
        if Path(name).name != name:
            raise RuntimeError('Unexpected inventory path')
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest:
            raise RuntimeError('Release checksum mismatch: ' + name)
    return manifest

def preflight():
    run('nginx', '-t')
    if run('systemctl', 'is-active', 'nginx').stdout.strip() != 'active':
        raise RuntimeError('nginx is not active')
    # nginx configuration does not touch publishing data. Defer during a file transfer.
    for path in Path('/proc').glob('[0-9]*/comm'):
        try:
            name = path.read_text().strip()
        except (FileNotFoundError, PermissionError):
            continue
        if name in {'sftp-server', 'scp', 'rsync'}:
            raise RuntimeError('A data transfer is active; retry preparation later')

def original_hashes():
    return {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('/etc/nginx/sites-enabled').iterdir() if p.is_file() and p.name != 'asg-site-front'}

def unlink_owned():
    for path, target in reversed(list(LINKS.items())):
        if path.is_symlink() and path.readlink() == target:
            path.unlink()
        elif path.exists() or path.is_symlink():
            raise RuntimeError('Refusing to remove a foreign nginx configuration')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'activate', 'rollback'])
    args = parser.parse_args()
    manifest = inventory()
    preflight()
    if args.action == 'prepare':
        if any(p.exists() or p.is_symlink() for p in LINKS):
            raise RuntimeError('Website nginx configuration already exists')
        Path('/opt/asg-site/acme-state').mkdir(mode=0o700, parents=True, exist_ok=True)
        Path('/var/www/asg-site-acme').mkdir(mode=0o755, parents=True, exist_ok=True)
        (ROOT / 'acme-hook.py').chmod(0o755)
        run('nginx', '-t', '-c', str(ROOT / 'acceptance.conf'))
        run('nginx', '-c', str(ROOT / 'acceptance.conf'))
        try:
            result = run('python3', str(ROOT / 'check-acceptance.py'), str(ROOT))
            tests = json.loads(result.stdout)
        finally:
            run('nginx', '-s', 'quit', '-c', str(ROOT / 'acceptance.conf'))
        save({'status':'prepared','version':VERSION,'inventory':manifest,'originalHashes':original_hashes(),'acceptance':tests})
        print(json.dumps({'status':'prepared','acceptance':tests}))
        return
    state = json.loads(JOURNAL.read_text())
    if args.action == 'rollback':
        unlink_owned()
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        state['status']='nginx-rolled-back'
        save(state)
        print(json.dumps({'status':state['status']}))
        return
    if state['status'] != 'prepared' or state['originalHashes'] != original_hashes():
        raise RuntimeError('Preparation or existing configuration changed')
    certificate = Path('/etc/letsencrypt/live/asgracing.ru/fullchain.pem')
    decoded = ssl._ssl._test_decode_cert(str(certificate))
    domains = {v for k,v in decoded.get('subjectAltName', []) if k == 'DNS'}
    if not {'asgracing.ru','www.asgracing.ru'}.issubset(domains):
        raise RuntimeError('Certificate does not cover both website names')
    if ssl.cert_time_to_seconds(decoded['notAfter']) < datetime.datetime.now(datetime.timezone.utc).timestamp() + 7*86400:
        raise RuntimeError('Certificate expires too soon')
    if any(p.exists() or p.is_symlink() for p in LINKS):
        raise RuntimeError('Website nginx configuration already exists')
    try:
        for path,target in LINKS.items():
            path.symlink_to(target)
        run('nginx','-t')
        run('systemctl','reload','nginx')
        # Graceful reload is asynchronous: wait for new workers to accept SNI.
        # Certificate verification remains enabled on every attempt.
        attempts=[]
        for attempt in range(10):
            try:
                check=run('curl','--noproxy','*','--fail','--silent','--show-error','--connect-timeout','5','--max-time','30',
                          '--resolve','asgracing.ru:443:127.0.0.1','https://asgracing.ru/')
                break
            except subprocess.CalledProcessError as error:
                attempts.append({'exit':error.returncode,'stderr':error.stderr[:1000]})
                if attempt==9: raise
                time.sleep(0.5)
        if 'ASG' not in check.stdout or len(check.stdout.encode()) < 50000:
            raise RuntimeError('Full root website verification failed')
        if state['originalHashes'] != original_hashes():
            raise RuntimeError('Existing vhost was modified')
        state['status']='nginx-active-dns-unchanged'
        state['workerReadinessRetries']=attempts
        save(state)
        print(json.dumps({'status':state['status'],'rootBytes':len(check.stdout.encode())}))
    except Exception as error:
        unlink_owned()
        run('nginx','-t')
        run('systemctl','reload','nginx')
        state['status']='nginx-rolled-back'
        state['activationFailure']=getattr(error,'stderr',str(error))[:1500]
        save(state)
        raise

if __name__ == '__main__':
    main()
