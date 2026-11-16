import unittest
import tempfile
from pathlib import Path
from datetime import date
from cbr_rates import parse_daily, convert_donation
from asg_donations_service import StateStore, sanitize_donation


class CbrRatesTests(unittest.TestCase):
    def test_nominal_weekend_effective_date_and_future_refusal(self):
        raw=b'<ValCurs Date="06.11.2026"><Valute><CharCode>JPY</CharCode><Nominal>100</Nominal><Value>54,1234</Value></Valute></ValCurs>'
        result=parse_daily(raw,date(2026,11,8))
        self.assertEqual(result['rates']['JPY'],'0.541234')
        self.assertEqual(result['effective_date'],'2026-11-06')
        with self.assertRaises(ValueError):parse_daily(raw,date(2026,11,5))

    def test_gross_historical_rub_conversion_rounding_cache_and_original_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            store=StateStore(Path(tmp)/'state.db');calls=[]
            def fetch(day):
                calls.append(day);return {'effective_date':'2026-11-06','rates':{'USD':'80.12345','JPY':'0.541234'}}
            raw=sanitize_donation(dict(id=1,username='Pilot',currency='USD',amount='2.50',created_at='2026-11-08 12:00:00'))
            first=convert_donation(raw,store,lambda:1,fetch)
            second=convert_donation(raw,store,lambda:2,fetch)
            self.assertEqual(first['rub_kopeks'],20031)
            self.assertEqual(first['amount_rub'],200.31)
            self.assertEqual(first['amount'],2.5);self.assertEqual(first['currency'],'USD')
            self.assertEqual(first,second);self.assertEqual(len(calls),1)
            with self.assertRaises(ValueError):convert_donation({**raw,'currency':'UNKNOWN'},store,lambda:1,fetch)
            # Offset-aware timestamps use the Moscow donation day.
            late=convert_donation({**raw,'created_at':'2026-11-07T22:30:00Z'},store,lambda:1,fetch)
            self.assertEqual(len(calls),1)
            self.assertEqual(late['amount_rub'],200.31)

    def test_rubles_never_fetch_rates(self):
        result=convert_donation(dict(amount=15.555,currency='RUB'),None,lambda:1,
            lambda _:self.fail('RUB must not fetch FX'))
        self.assertEqual(result['rub_kopeks'],1556)


if __name__=='__main__':unittest.main()
