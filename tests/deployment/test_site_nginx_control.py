import copy
from contextlib import contextmanager
import importlib.util
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/site-nginx-release'))
import control
import transfer

class FixtureCF:
    base='/zones/fixture'
    def __init__(self,fail=False):
        self.rows=[dict(id=str(i),type='CNAME',name=n,content='asgracing.github.io',proxied=False,ttl=1) for i,n in enumerate(sorted(control.HOSTS))]
        self.rows.append(dict(id='other',type='A',name='data.asgracing.ru',content=control.IP,proxied=False,ttl=1))
        self.before=copy.deepcopy(self.rows);self.fail=fail;self.failed=False
    def records(self):return copy.deepcopy(self.rows)
    def api(self,method,path,**kwargs):
        ident=path.rsplit('/',1)[-1]
        row=next(r for r in self.rows if r['id']==ident)
        if method=='GET':return copy.deepcopy(row)
        assert method=='PATCH' and ident!='other'
        if self.fail and ident=='1' and not self.failed:
            self.failed=True;raise RuntimeError('Fixture failure')
        row.update(kwargs['json']);return copy.deepcopy(row)

class SiteNginxTests(unittest.TestCase):
    def test_scp_transfer_uses_cap_and_shared_slot(self):
        entered=[];commands=[]
        @contextmanager
        def slot():
            entered.append(True)
            yield
            entered.pop()
        def run(command,**kwargs):
            self.assertEqual(entered,[True]);commands.append(command)
        fake=types.SimpleNamespace(vps_transfer_slot=slot)
        with patch.dict(sys.modules,{'vps_transfer':fake}),patch.object(transfer.subprocess,'run',run):
            transfer.upload(transfer.WORKSPACE/'tmp/site-redirects-20261008-r1.tar.gz')
        self.assertEqual(commands[0][:3],['scp','-l','18000'])
        self.assertIn('StrictHostKeyChecking=yes',commands[0])
        self.assertTrue(commands[0][-1].startswith('root@200.165.229.139:/tmp/'))
        with self.assertRaises(ValueError):transfer.scp_command(transfer.WORKSPACE/'portal-secrets/site-redirects-20261008-r1.tar.gz')
    def test_dns_cutover_preserves_other_records_and_rolls_back(self):
        for fail in (False,True):
            cf=FixtureCF(fail)
            with tempfile.TemporaryDirectory() as d:
                path=Path(d)/'journal.json'
                if fail:
                    with self.assertRaises(RuntimeError):control.cutover(cf,path)
                    self.assertEqual(cf.rows,cf.before)
                else:
                    control.cutover(cf,path)
                    self.assertEqual(cf.rows[-1],cf.before[-1])
                    self.assertTrue(all(r['type']=='A' and not r['proxied'] for r in cf.rows[:2]))
                    control.rollback(cf,path)
                    self.assertEqual(cf.rows,cf.before)
    def test_dns_wrong_origin_aborts_before_writes(self):
        cf=FixtureCF();cf.rows[0]['content']='unexpected.example'
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(RuntimeError):control.cutover(cf,Path(d)/'journal.json')
        self.assertFalse(cf.failed)
    def test_journal_payload_uses_paced_transport(self):
        seen=[]
        def limited(command,payload,**kwargs):
            self.assertEqual(kwargs['limit_kbps'],18000)
            self.assertTrue(kwargs['check'])
            self.assertIn('StrictHostKeyChecking=yes',command)
            seen.append(payload)
            return types.SimpleNamespace(stdout=b'{"status":"active"}')
        with patch.dict(sys.modules,{'vps_transfer':types.SimpleNamespace(run_with_limited_stdin=limited)}):
            control.write_final_journal('site-redirects-20261008-r2','a'*40,[])
        self.assertIn(b'"sourceRevision"',seen[0])

if __name__=='__main__':unittest.main()
