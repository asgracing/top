"""Prepare a flat allowlisted website nginx payload with SHA-256 inventory."""
import hashlib
import json
from pathlib import Path
import sys
import tarfile

directory=Path(sys.argv[1]).resolve()
source=Path(__file__).resolve().parent
for name in ('install.py','acme-hook.py','check-acceptance.py'):
    # Windows checkouts may use CRLF; executable Linux shebangs require LF.
    (directory/name).write_text((source/name).read_text(encoding='utf-8'),encoding='utf-8',newline='\n')
names=('maps.conf','site.conf','acceptance.conf','cases.json','install.py','acme-hook.py','check-acceptance.py')
manifest={'component':'site-nginx','version':directory.name,'files':{n:hashlib.sha256((directory/n).read_bytes()).hexdigest() for n in names}}
(directory/'inventory.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
archive=directory.with_suffix('.tar.gz')
with tarfile.open(archive,'w:gz') as tar:
    for name in (*names,'inventory.json'):
        tar.add(directory/name,arcname=name,recursive=False)
print(json.dumps({'archive':str(archive),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':len(names)+1}))
