#!/usr/bin/python3
"""Bootstrap DNS challenge via the local operator, without a VPS API token."""
import json
import os
from pathlib import Path
import time
import uuid

domain = os.environ['CERTBOT_DOMAIN']
if domain not in {'asgracing.ru', 'www.asgracing.ru'}:
    raise SystemExit('Unexpected certificate domain')
state = Path('/opt/asg-site/acme-state')
state.mkdir(mode=0o700, parents=True, exist_ok=True)
nonce = uuid.uuid4().hex
path = state / (domain + '.json')
path.write_text(json.dumps({'domain':domain, 'value':os.environ['CERTBOT_VALIDATION'], 'nonce':nonce}) + '\n')
path.chmod(0o600)
ready = state / (nonce + '.ready')
try:
    for _ in range(150):
        if ready.exists():
            break
        time.sleep(2)
    else:
        raise SystemExit('DNS readiness was not confirmed within 300 seconds')
finally:
    ready.unlink(missing_ok=True)
    path.unlink(missing_ok=True)
