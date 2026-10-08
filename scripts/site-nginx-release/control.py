"""Local operator for DNS bootstrap, cutover and rollback; token stays local."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import time
import requests
from transfer import SSH_OPTIONS, HOST, WORKSPACE

HOSTS = {'asgracing.ru','www.asgracing.ru'}
IP = '200.165.229.139'

def ssh(command, timeout=30):
    return subprocess.run(['ssh',*SSH_OPTIONS,HOST,command],check=True,capture_output=True,text=True,timeout=timeout).stdout

class Cloudflare:
    def __init__(self):
        token=os.environ.get('CLOUDFLARE_API_TOKEN')
        if not token: raise RuntimeError('Saved Cloudflare token unavailable')
        self.session=requests.Session()
        self.session.headers['Authorization']='Bearer '+token
        zones=self.api('GET','/zones',params={'name':'asgracing.ru','per_page':1})
        if len(zones)!=1 or zones[0]['status']!='active': raise RuntimeError('Expected active ASG zone')
        self.base='/zones/'+zones[0]['id']

    def api(self,method,path,**kwargs):
        r=self.session.request(method,'https://api.cloudflare.com/client/v4'+path,timeout=25,**kwargs)
        data=r.json()
        if not r.ok or not data.get('success'):
            codes=[e.get('code') for e in data.get('errors',[])]
            raise RuntimeError(f'Cloudflare HTTP {r.status_code}, codes {codes}')
        return data['result']

    def records(self): return self.api('GET',self.base+'/dns_records',params={'per_page':100})

def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')

def select(records):
    selected=[r for r in records if r['name'] in HOSTS]
    if len(selected)!=2 or {r['name'] for r in selected}!=HOSTS:
        raise RuntimeError('Expected exactly two website DNS records')
    return selected

def dns_fields(r): return {k:r.get(k) for k in ('id','type','name','content','proxied','ttl','comment','tags','settings')}

def public_txt_ready(name,value):
    try:
        if not re.fullmatch(r'_acme-challenge\.(?:www\.)?asgracing\.ru',name):
            raise RuntimeError('Unexpected public DNS name')
        command=("$rows=@(Resolve-DnsName -Name '"+name+"' -Type TXT -Server 1.1.1.1 -DnsOnly -QuickTimeout -ErrorAction Stop); "
                 "$values=@($rows | Where-Object { $_.Strings } | ForEach-Object { $_.Strings -join '' }); ConvertTo-Json -Compress -InputObject $values")
        result=subprocess.run(['powershell.exe','-NoProfile','-Command',command],check=True,text=True,capture_output=True,timeout=12)
        return value in json.loads(result.stdout.lstrip('\ufeff'))
    except (subprocess.SubprocessError, ValueError): return False

def issue(cf,version):
    remote='/opt/asg-site/releases/'+version
    known=[]
    command=('certbot certonly --non-interactive --manual --preferred-challenges dns '
             '--manual-auth-hook '+remote+'/acme-hook.py --cert-name asgracing.ru '
             '-d asgracing.ru -d www.asgracing.ru --no-directory-hooks > '+remote+'/certbot.log 2>&1')
    proc=subprocess.Popen(['ssh',*SSH_OPTIONS,HOST,command],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    handled=set()
    deadline=time.monotonic()+650
    try:
        while proc.poll() is None:
            if time.monotonic()>deadline: raise RuntimeError('Certificate bootstrap timeout')
            raw=ssh('cat /opt/asg-site/acme-state/*.json 2>/dev/null || true')
            for line in raw.splitlines():
                challenge=json.loads(line)
                domain=challenge['domain']; nonce=challenge['nonce']; value=challenge['value']
                if domain not in HOSTS or not re.fullmatch('[0-9a-f]{32}',nonce) or not re.fullmatch('[A-Za-z0-9_-]+',value):
                    raise RuntimeError('Unexpected certificate challenge')
                if nonce in handled: continue
                name='_acme-challenge.'+domain
                body={'type':'TXT','name':name,'content':value,'ttl':120}
                result=cf.api('POST',cf.base+'/dns_records',json=body)
                known.append((result['id'],name,value))
                print(json.dumps({'phase':'dns-challenge-created','domain':domain}),flush=True)
                ready=False
                for _ in range(45):
                    if public_txt_ready(name,value): ready=True; break
                    if proc.poll() is not None: raise RuntimeError('Certbot stopped before DNS confirmation')
                    time.sleep(3)
                if not ready: raise RuntimeError('Public DNS did not confirm certificate challenge')
                ssh('touch /opt/asg-site/acme-state/'+nonce+'.ready')
                handled.add(nonce)
                print(json.dumps({'phase':'dns-challenge-confirmed','domain':domain}),flush=True)
            time.sleep(2)
        out,err=proc.communicate(timeout=10)
        if proc.returncode: raise RuntimeError('Certbot failed; inspect scoped certbot.log on VPS')
        print(json.dumps({'status':'certificate-issued','domains':sorted(HOSTS)}))
    finally:
        if proc.poll() is None:
            proc.terminate()
            proc.communicate(timeout=15)
        for ident,name,value in known:
            record=cf.api('GET',cf.base+'/dns_records/'+ident)
            if record['name']!=name or record['type']!='TXT' or record['content']!=value:
                raise RuntimeError('Challenge record changed; refusing cleanup')
            cf.api('DELETE',cf.base+'/dns_records/'+ident)

def cutover(cf,path):
    records=cf.records(); selected=select(records)
    for r in selected:
        if r['type']!='CNAME' or r['content'].rstrip('.')!='asgracing.github.io' or r['proxied']:
            raise RuntimeError('Unexpected current website DNS; cutover stopped')
    state={'status':'prepared','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'zone':cf.base,'before':records,'changed':[]}
    save(path,state)
    attempted=[]
    try:
        for r in selected:
            attempted.append(r)
            cf.api('PATCH',cf.base+'/dns_records/'+r['id'],json={'type':'A','content':IP,'proxied':False,'ttl':300})
            state['changed'].append(r['name']);save(path,state)
        after=cf.records()
        for r in select(after):
            if r['type']!='A' or r['content']!=IP or r['proxied'] or r['ttl']!=300: raise RuntimeError('Website DNS verification mismatch')
        others=lambda rows:{r['id']:dns_fields(r) for r in rows if r['name'] not in HOSTS}
        if others(after)!=others(records): raise RuntimeError('An unrelated DNS record changed')
        state.update(status='dns-active',after=after);save(path,state)
        print(json.dumps({'status':state['status'],'changed':state['changed'],'backup':str(path)}))
    except Exception:
        for r in reversed(attempted):
            current=cf.api('GET',cf.base+'/dns_records/'+r['id'])
            if current['name']!=r['name'] or current['content'] not in {IP,r['content']}:
                raise RuntimeError('DNS record was changed by another operator; rollback stopped')
            cf.api('PATCH',cf.base+'/dns_records/'+r['id'],json={k:r[k] for k in ('type','content','proxied','ttl')})
        state['status']='dns-rolled-back';save(path,state)
        raise

def rollback(cf,path):
    state=json.loads(path.read_text(encoding='utf-8'))
    if state['zone']!=cf.base: raise RuntimeError('Rollback zone mismatch')
    current=select(cf.records())
    original=select(state['before'])
    if {r['id'] for r in original}!={r['id'] for r in current}: raise RuntimeError('Rollback record identity mismatch')
    for r in current:
        if r['type']!='A' or r['content']!=IP or r['proxied']: raise RuntimeError('DNS state changed; rollback stopped')
    for r in original:
        cf.api('PATCH',cf.base+'/dns_records/'+r['id'],json={k:r[k] for k in ('type','content','proxied','ttl')})
    restored=select(cf.records())
    for r in original:
        actual=next(n for n in restored if n['id']==r['id'])
        if any(actual[k]!=r[k] for k in ('type','content','proxied','ttl')): raise RuntimeError('Rollback verification failed')
    state['status']='dns-rolled-back';save(path,state)
    # Keep nginx available for visitors with old cached DNS; remove it later separately.
    print(json.dumps({'status':state['status'],'nginxRetainedForCachedDNS':True}))

def write_final_journal(version,revision,dns):
    if not re.fullmatch(r'site-redirects-\d{8}-r\d+',version) or not re.fullmatch('[0-9a-f]{40}',revision):
        raise RuntimeError('Invalid final journal identity')
    sys_path=WORKSPACE/'asg-stats-server/server'
    import sys
    sys.path.insert(0,str(sys_path))
    from vps_transfer import run_with_limited_stdin
    program=("import datetime,hashlib,json,pathlib,ssl,sys; "
             "p=pathlib.Path('/opt/asg-site/deployment-journal/"+version+".json'); s=json.loads(p.read_text()); "
             "assert s['status']=='nginx-active-dns-unchanged'; "
             "assert all(hashlib.sha256(pathlib.Path(k).read_bytes()).hexdigest()==v for k,v in s['originalHashes'].items()); "
             "r=pathlib.Path('/etc/letsencrypt/renewal/asgracing.ru.conf').read_text(); assert 'authenticator = webroot' in r; "
             "s.update(json.load(sys.stdin)); s['certificateNotAfter']=ssl._ssl._test_decode_cert('/etc/letsencrypt/live/asgracing.ru/fullchain.pem')['notAfter']; "
             "s['updatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat(); p.write_text(json.dumps(s,indent=2)+'\\n'); print(json.dumps({'status':s['status'],'sourceRevision':s['sourceRevision']}))")
    payload=json.dumps({'status':'active','sourceRevision':revision,'dns':dns,'renewal':'webroot','operator':'Codex, user-authorized'}).encode('utf-8')
    result=run_with_limited_stdin(['ssh',*SSH_OPTIONS,HOST,'python3 -c '+shlex.quote(program)],payload,limit_kbps=18000,timeout=45,check=True)
    print(result.stdout.decode('utf-8').strip())

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['issue-tls','cutover','rollback','configure-renewal','finalize'])
    parser.add_argument('--version',required=True)
    parser.add_argument('--revision')
    args=parser.parse_args()
    if not re.fullmatch(r'site-redirects-\d{8}-r\d+',args.version): raise RuntimeError('Invalid release identifier')
    if args.action=='configure-renewal':
        ssh('cp --preserve=mode /etc/letsencrypt/renewal/asgracing.ru.conf /opt/asg-site/deployment-journal/asgracing.ru-renewal-bootstrap.conf')
        result=ssh("certbot reconfigure --cert-name asgracing.ru --webroot --webroot-path /var/www/asg-site-acme --preferred-challenges http --non-interactive --no-directory-hooks --deploy-hook 'nginx -t && systemctl reload nginx'",timeout=300)
        print(json.dumps({'status':'renewal-configured','authenticator':'webroot','reloadHook':True}))
        return
    cf=Cloudflare()
    path=WORKSPACE/'tmp/site-nginx-release'/(args.version+'-dns.json')
    if args.action=='finalize':
        records=select(cf.records())
        if not all(r['type']=='A' and r['content']==IP and not r['proxied'] for r in records):raise RuntimeError('Public DNS is not on the verified gateway')
        write_final_journal(args.version,args.revision or '',[{k:r[k] for k in ('name','type','content','proxied')} for r in records])
    elif args.action=='issue-tls': issue(cf,args.version)
    elif args.action=='cutover':
        journal=json.loads(ssh('cat /opt/asg-site/deployment-journal/'+args.version+'.json'))
        if journal['status']!='nginx-active-dns-unchanged': raise RuntimeError('nginx has not passed activation')
        cutover(cf,path)
    else: rollback(cf,path)

if __name__=='__main__': main()
