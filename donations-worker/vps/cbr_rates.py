"""Archived CBR daily quotes. No current-rate fallback or fee deductions."""
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from urllib.request import Request, urlopen
from xml.etree import ElementTree


def read_daily(day):
    url='https://www.cbr.ru/scripts/XML_daily.asp?date_req='+day.strftime('%d/%m/%Y')
    with urlopen(Request(url,headers={'User-Agent':'ASG-Racing-donation-history/1.0'}),timeout=8) as response:
        raw=response.read(1024*1024+1)
    if len(raw)>1024*1024 or b'<!DOCTYPE' in raw.upper():
        raise ValueError('Invalid CBR response size or document type')
    return parse_daily(raw,day)


def parse_daily(raw,day):
    root=ElementTree.fromstring(raw)
    effective=datetime.strptime(root.attrib['Date'],'%d.%m.%Y').date()
    if root.tag!='ValCurs' or effective>day or (day-effective).days>14:
        raise ValueError('CBR effective date does not cover donation date')
    rates={}
    for row in root.findall('Valute'):
        nominal=Decimal(row.findtext('Nominal','0'))
        value=Decimal(row.findtext('Value','0').replace(',','.'))
        if not nominal.is_finite() or not value.is_finite() or nominal<=0 or value<=0:
            raise ValueError('Invalid CBR quote')
        rates[row.findtext('CharCode')]=str(value/nominal)
    if not rates:raise ValueError('CBR quotes missing')
    return {'effective_date':effective.isoformat(),'rates':rates}


def convert_donation(item,store,clock,fetch=read_daily):
    if item.get('amount') is None:raise ValueError('Donation amount missing')
    amount=Decimal(str(item['amount']))
    if not amount.is_finite() or amount<0:raise ValueError('Invalid donation amount')
    if item['currency']=='RUB':
        rate=Decimal(1);effective=None
    else:
        timestamp=datetime.fromisoformat(item['created_at'].replace('Z','+00:00'))
        if timestamp.tzinfo:timestamp=timestamp.astimezone(timezone(timedelta(hours=3)))
        day=timestamp.date();key='cbr:donation-day-v1:'+day.isoformat()
        quotes=store.get(key)
        if not quotes:
            quotes=fetch(day);store.put(key,quotes,clock())
        if item['currency'] not in quotes['rates']:
            raise ValueError('CBR does not quote donation currency on this date')
        rate=Decimal(quotes['rates'][item['currency']]);effective=quotes['effective_date']
    kopeks=int((amount*rate*100).quantize(Decimal(1),rounding=ROUND_HALF_UP))
    return {**item,'rub_kopeks':kopeks,'amount_rub':kopeks/100,
        'fx_rate':str(rate),'fx_date':effective,'fx_source':'CBR' if effective else 'RUB'}
