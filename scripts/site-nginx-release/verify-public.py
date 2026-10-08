"""Compare the staged gateway to GitHub and verify real public 301 responses."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import sys
import tempfile

VPS='200.165.229.139'
ORIGIN='185.199.108.153'
root=Path(__file__).resolve().parents[3]
output=root/'tmp/site-nginx-release/public-verification.json'

def fetch(path,address=VPS,host='asgracing.ru',scheme='https',method='GET'):
    curl=str(Path('C:/Windows/System32/curl.exe')) if sys.platform=='win32' else 'curl'
    with tempfile.TemporaryDirectory(dir=root/'tmp') as d:
        body=Path(d)/'body';headers=Path(d)/'headers'
        command=[curl,'--disable','--noproxy','*','-4','-sS','--connect-timeout','5','--max-time','30',
                 '--resolve',f'{host}:443:{address}','--resolve',f'{host}:80:{address}',
                 '-D',str(headers),'-o',str(body),'-w','%{http_code}',f'{scheme}://{host}{path}']
        if method=='HEAD': command.insert(1,'--head')
        result=subprocess.run(command,check=True,capture_output=True,text=True,timeout=40)
        text=headers.read_text(encoding='iso-8859-1')
        location=next((line.partition(':')[2].strip() for line in text.splitlines() if line.lower().startswith('location:')),None)
        data=body.read_bytes()
        return {'status':int(result.stdout),'location':location,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'headers':text},data

class Assets(HTMLParser):
    def __init__(self):super().__init__();self.paths=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if not value:continue
            values=value.split(',') if key=='srcset' else [value]
            for part in values:
                path=part.strip().split(' ')[0]
                if path.startswith('/') and not path.startswith('//') and (path.split('?')[0].endswith(('.js','.css')) or 'dudarev' in path.lower()):
                    if path not in self.paths:self.paths.append(path)

checks=[]
home,html=fetch('/')
assets=Assets();assets.feed(html.decode('utf-8'))
paths=['/','/en/','/old/','/robots.txt','/sitemap.xml']+assets.paths
for path in paths:
    gateway,data=fetch(path)
    origin,original=fetch(path,ORIGIN)
    if gateway['status']!=200 or origin['status']!=200 or data!=original:
        raise RuntimeError('Public content differs: '+path)
    if 'x-frame-options:' in gateway['headers'].lower() or 'content-security-policy:' in gateway['headers'].lower():
        raise RuntimeError('Unexpected frame policy: '+path)
    checks.append({'path':path,'status':gateway['status'],'bytes':gateway['bytes'],'sha256':gateway['sha256'],'originIdentical':True})

redirects=[('/ru/','/'),('/v2/ru/','/'),('/preview/ru/','/'),('/v2/en/','/en/'),
           ('/preview/ru/driver/?id=drv_public&from=asg','/driver/?id=drv_public&from=asg'),
           ('/ru/races/?utm_source=asg&race_id=public-test','/race/?utm_source=asg&id=public-test'),
           ('/en/news/?slug=public-test&utm_source=asg','/en/news/article/?id=public-test&utm_source=asg')]
for path,target in redirects:
    result,_=fetch(path)
    if result['status']!=301 or result['location']!='https://asgracing.ru'+target:raise RuntimeError('Wrong 301: '+path)
    checks.append({'path':path,'status':result['status'],'location':result['location']})
for host,scheme in [('www.asgracing.ru','https'),('asgracing.ru','http')]:
    result,_=fetch('/ru/?utm_source=asg',host=host,scheme=scheme)
    if result['status']!=301 or result['location']!='https://asgracing.ru/?utm_source=asg':raise RuntimeError('Canonical redirect failed')
    checks.append({'host':host,'scheme':scheme,'status':result['status'],'location':result['location']})
result,_=fetch('/ru/',method='HEAD')
if result['status']!=301 or result['location']!='https://asgracing.ru/':raise RuntimeError('HEAD migration failed')
result,_=fetch('/asg-nonexistent-verification-path/')
if result['status']!=404:raise RuntimeError('Unknown URL must keep HTTP 404')
report={'status':'passed','forcedIP':VPS,'contentChecks':len(paths),'redirectChecks':len(redirects)+3,'checks':checks,'unknownStatus':404}
output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'passed','contentChecks':len(paths),'redirectChecks':len(redirects)+3,'report':str(output)}))
