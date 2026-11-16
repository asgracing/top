import tempfile
import unittest
import http.client
import threading
from pathlib import Path
from unittest.mock import patch

from asg_donations_service import DonationService, StateStore, Server, sanitize_donation
from donation_history import CACHE, PROGRESS, DonationHistory, summarize
from cbr_rates import convert_donation
from test_asg_donations_service import make_config


def donation(i, name='Pilot', amount=100, currency='RUB'):
    return dict(id=str(i), username=name, amount=amount, currency=currency, created_at='2020-01-01 12:00:00')


class HistoryTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        path = Path(temp.name) / 'state.sqlite3'
        self.service = DonationService(make_config(path), StateStore(path), clock=lambda: 1000)
        self.service.usable_tokens = lambda: {'access_token': 'fixture'}
        self.history = self.service.history

    def refresh(self):
        self.history.lock.acquire(); self.history.refresh()

    def test_complete_pagination_ignores_recent_date_limit_and_deduplicates(self):
        pages = [dict(data=[donation(3),donation(2)], links={'next': 'not-followed'}, meta={'total': 3}),
                 dict(data=[donation(2),donation(1)], links={'next': None})]
        with patch.object(self.service, 'authenticated_get', side_effect=[(p,{}) for p in pages]) as get:
            self.refresh()
        self.assertEqual(get.call_count, 2)
        snapshot = self.service.store.get(CACHE)
        self.assertTrue(snapshot['complete']); self.assertEqual(snapshot['total_items'], 3)
        self.assertEqual(snapshot['currencies'][0]['total'], 300)
        page = self.history.read(0,2)
        last = self.history.read(page['next_offset'],2,page['revision'])
        self.assertEqual(len(last['items']),1); self.assertIsNone(last['next_offset'])
        self.assertFalse(self.history.read(0,2,'old')['ok'])

    def test_partial_or_failed_upstream_does_not_replace_last_complete(self):
        self.service.store.put(CACHE, {'complete':True,'revision':'old','updated_at':1000,
            'items':[],'currencies':[],'total_items':0}, 1000)
        with patch.object(self.service,'authenticated_get',return_value=({'data':[donation(1)],'meta':{'total':2},'links':{'next':None}},{})):
            self.refresh()
        self.assertEqual(self.service.store.get(CACHE)['revision'],'old')

    def test_currencies_nicknames_anonymous_and_ties(self):
        rows = [donation(1,'  PILOT  One ',30),donation(2,'pilot one',70),
            donation(3,'Anonymous',500),donation(4,'Аноним',900),donation(5,'Other',100),
            donation(6,'Euro',20,'EUR'),donation(7,'invalid',-5)]
        converted=[{**sanitize_donation(d),'rub_kopeks':d['amount']*(9000 if d['currency']=='EUR' else 100)} for d in rows]
        rub, = summarize(converted)
        self.assertEqual(rub['currency'],'RUB'); self.assertEqual(rub['total'],3400)
        self.assertEqual(rub['count'],6)
        self.assertEqual(rub['top'][2]['count'],2)
        self.assertEqual({d['username'] for d in rub['top']},{'PILOT One','Other','Euro'})

    def test_one_donor_aggregates_rubles_and_foreign_donations_at_historical_rates(self):
        self.service.store.put('cbr:donation-day-v1:2020-01-01',
            {'effective_date':'2019-12-31','rates':{'USD':'60'}},1000)
        raw=[donation(1,'Pilot',50),donation(2,' PILOT ',10,'USD'),donation(3,'Anonymous',10000)]
        converted=[convert_donation(sanitize_donation(d),self.service.store,self.service.clock) for d in raw]
        rub,=summarize(converted)
        self.assertEqual(rub['top'][0]['amount'],650)
        self.assertEqual(rub['top'][0]['count'],2)
        self.assertEqual(rub['total'],10650)

    def test_large_history_resumes_without_exposing_partial(self):
        pages = iter(range(1,102))
        def get(url,tokens):
            i=next(pages); return {'data':[donation(i)],'links':{'next':None if i==101 else 'next'},'meta':{'total':101}}, tokens
        with patch.object(self.service,'authenticated_get',side_effect=get):
            self.refresh()
            self.assertIsNone(self.service.store.get(CACHE))
            self.assertEqual(self.service.store.get(PROGRESS)['page'],101)
            self.refresh()
        self.assertEqual(self.service.store.get(CACHE)['total_items'],101)

    def test_malformed_upstream_never_becomes_complete_history(self):
        for page in ({'data':[donation(1)],'links':{'next':None}},
                     {'data':[donation(1)],'meta':{'total':1}}):
            with patch.object(self.service,'authenticated_get',return_value=(page,{})):
                self.refresh()
            self.assertIsNone(self.service.store.get(CACHE))

    def test_http_pagination_validation_and_revision_conflict(self):
        self.service.store.put(CACHE,{'complete':True,'revision':'current','updated_at':1000,
            'total_items':1,'items':[sanitize_donation(donation(1))],'currencies':[]},1000)
        server=Server(('127.0.0.1',0),self.service)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            connection=http.client.HTTPConnection(*server.server_address,timeout=3)
            for path,status in [('/history?limit=101',400),('/history?offset=-1',400),
                                ('/history?revision=old',409),('/history?limit=1',200)]:
                connection.request('GET',path,headers={'Origin':'https://asgracing.ru'})
                response=connection.getresponse();self.assertEqual(response.status,status);response.read()
                self.assertEqual(response.getheader('Access-Control-Allow-Origin'),'https://asgracing.ru')
            connection.close()
        finally:server.shutdown();server.server_close();thread.join(3)


if __name__ == '__main__': unittest.main()
