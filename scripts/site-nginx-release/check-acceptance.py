"""Check generated routing against real isolated nginx, without following URLs."""
import http.client
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
cases = json.loads((root / 'cases.json').read_text())
failures = []
for case in cases:
    conn = http.client.HTTPConnection('127.0.0.1', 8842, timeout=5)
    conn.request(case['method'], case['path'], headers={'Host': case['host']})
    response = conn.getresponse()
    location = response.getheader('Location')
    response.read()
    if response.status != case['status'] or location != case['location']:
        failures.append({'path':case['path'],'method':case['method'],'expected':case['status'], 'actual':response.status,'expectedLocation':case['location'],'actualLocation':location})
    conn.close()
print(json.dumps({'cases':len(cases),'passed':len(cases)-len(failures),'failures':failures[:12]}))
raise SystemExit(bool(failures))
