"""Complete, atomic public DonationAlerts snapshots; independent of recent filters."""
import hashlib
import json
import logging
import threading
import time
from decimal import Decimal
from cbr_rates import convert_donation

CACHE = 'donationalerts:complete-history-rub-v2'
PROGRESS = 'donationalerts:history-progress-rub-v2'
URL = 'https://www.donationalerts.com/api/v1/alerts/donations?page='
ANONYMOUS = {'anonymous', 'аноним', 'анонимно', 'анонимный', 'анонимный пользователь'}


def summarize(items):
    currencies = {}
    for item in items:
        amount = Decimal(item['rub_kopeks']) / 100
        if not amount.is_finite() or amount <= 0 or not item.get('currency'):
            continue
        currency = 'RUB'
        group = currencies.setdefault(currency, {'currency': currency, 'total': Decimal(0),
            'count': 0, 'largest': Decimal(0), 'donors': {}})
        group['total'] += amount; group['count'] += 1
        group['largest'] = max(group['largest'], amount)
        name = ' '.join(item['username'].split()); key = name.casefold()
        if key not in ANONYMOUS:
            donor = group['donors'].setdefault(key, {'username': name, 'amount': Decimal(0), 'count': 0})
            donor['amount'] += amount; donor['count'] += 1
    result = []
    for currency, group in sorted(currencies.items()):
        donors = sorted(group.pop('donors').values(), key=lambda d: (-d['amount'], d['username'].casefold()))
        group['supporters'] = len(donors)
        group['top'] = [{**d, 'amount': float(d['amount'])} for d in donors[:3]]
        group['average'] = float(group['total'] / group['count'])
        group['total'] = float(group['total']); group['largest'] = float(group['largest'])
        result.append(group)
    return result


class DonationHistory:
    def __init__(self, service, sanitize):
        self.service = service; self.sanitize = sanitize
        self.lock = threading.Lock(); self.next_attempt = 0

    def refresh(self):
        """Bound each worker, resume large histories; expose only a complete snapshot."""
        service = self.service
        try:
            deadline = time.monotonic() + 25
            progress = service.store.get(PROGRESS) or {'page': 1, 'items': [], 'total': None}
            if progress.get('phase')=='convert':
                self.convert(progress,deadline)
                return
            tokens = service.usable_tokens()
            if not tokens:
                return
            items = {item['id']: item for item in progress['items']}
            for _ in range(100):
                page = progress['page']
                if page > 10000 or len(items) > 300000:
                    raise ValueError('Donation history exceeds snapshot budget')
                data, tokens = service.authenticated_get(URL + str(page), tokens)
                if not isinstance(data, dict) or not isinstance(data.get('data'), list):
                    raise ValueError('Invalid donation history page')
                meta = data.get('meta') or {}
                if page == 1:
                    if type(meta.get('total')) is not int or meta['total'] < 0:
                        raise ValueError('Donation history total missing')
                    progress['total'] = meta.get('total')
                for raw in data['data']:
                    item = self.sanitize(raw)
                    if not item['id']:
                        raise ValueError('Donation history ID missing')
                    items[item['id']] = item
                links = data.get('links')
                if not isinstance(links, dict) or 'next' not in links:
                    raise ValueError('Donation history pagination missing')
                more = links['next']
                if not more:
                    expected = progress['total']
                    if type(expected) is int and len(items) != expected:
                        service.store.put(PROGRESS, None, service.clock())
                        raise ValueError('Donation history changed during pagination; retry full snapshot')
                    ordered = sorted(items.values(), key=lambda d: (d['created_at'], int(d['id']) if d['id'].isdigit() else 0, d['id']), reverse=True)
                    conversion={'phase':'convert','index':0,'items':ordered}
                    service.store.put(PROGRESS,conversion,service.clock())
                    self.convert(conversion,deadline)
                    return
                if not data['data']:
                    raise ValueError('Empty nonterminal donation history page')
                progress['page'] = page + 1
                if time.monotonic() >= deadline:
                    break
            service.store.put(PROGRESS, {**progress, 'items': list(items.values())}, service.clock())
        except Exception:
            logging.getLogger('asg-donations').warning('Complete donation history refresh failed', exc_info=True)
        finally:
            self.next_attempt = service.clock() + 30
            self.lock.release()

    def convert(self,progress,deadline):
        service=self.service
        while progress['index']<len(progress['items']):
            index=progress['index']
            progress['items'][index]=convert_donation(progress['items'][index],service.store,service.clock)
            progress['index']+=1
            if time.monotonic()>=deadline:
                service.store.put(PROGRESS,progress,service.clock())
                return
        ordered=progress['items']
        revision=hashlib.sha256(json.dumps(ordered,sort_keys=True).encode()).hexdigest()
        snapshot={'complete':True,'revision':revision,'updated_at':service.clock(),
            'total_items':len(ordered),'currencies':summarize(ordered),'items':ordered,
            'conversion_policy':'cbr-donation-day-gross-v1'}
        service.store.put(CACHE,snapshot,service.clock())
        service.store.put(PROGRESS,None,service.clock())

    def read(self, offset=0, limit=50, revision=None):
        snapshot = self.service.store.get(CACHE)
        now = self.service.clock()
        if (not snapshot or now - snapshot['updated_at'] >= 600) and now >= self.next_attempt:
            if self.lock.acquire(blocking=False):
                threading.Thread(target=self.refresh, name='donation-history', daemon=True).start()
        if not snapshot:
            return {'ok': True, 'complete': False, 'items': [], 'currencies': [], 'retry_after': 30}
        if revision and revision != snapshot['revision']:
            return {'ok': False, 'error': 'history_revision_changed'}
        items = snapshot['items'][offset:offset + limit]
        return {**{key: value for key, value in snapshot.items() if key != 'items'},
            'ok': True, 'stale': now - snapshot['updated_at'] >= 600,
            'offset': offset, 'items': items, 'next_offset': offset + len(items)
            if offset + len(items) < snapshot['total_items'] else None}
