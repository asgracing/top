import assert from 'node:assert/strict';
import test from 'node:test';
import {liveDriverProfile, liveRanking} from '../../v2/live-stats.js';
import {readRecentHourlyRaces} from '../../v2/pages/race-archive-api.js';

const id = 'drv_123456789abc';
const json = (body, status = 200) => Response.json(body, {status});

function mockSite(t, fetch) {
  t.mock.method(globalThis, 'fetch', fetch);
  globalThis.location = {origin: 'https://asgracing.ru'};
  t.after(() => delete globalThis.location);
}

test('searches and sorts server-side and accepts a clamped page', async t => {
  mockSite(t, async url => {
    const query = new URL(url).searchParams;
    assert.deepEqual(Object.fromEntries(query), {page: '2', limit: '10', kind: 'leaderboard', q: 'Алексей', sort: 'team', order: 'desc'});
    return json({revision: 2, page: 1, total_items: 1, items: [{public_id: id}]});
  });
  const page = await liveRanking('leaderboard', 2, '', {query: 'Алексей', sort: 'team', direction: -1});
  assert.equal(page.page, 1);
});

test('rejects a private identifier or oversized search before contacting the API', async t => {
  mockSite(t, async () => assert.fail('invalid search left the browser'));
  for (const query of ['11111111111111111', 'Ｓ１１１１１１１１１１１１１１１１１',
                      'steam://example', 'a'.repeat(101)]) {
    await assert.rejects(liveRanking('leaderboard', 1, '', {query}), {code: 'invalid_query'});
  }
});

test('retries a gateway timeout once for ranking searches', async t => {
  let attempts = 0;
  mockSite(t, async () => ++attempts === 1 ? json({},504) :
    json({revision:5,page:1,total_items:1,items:[{public_id:id}]}));
  const result = await liveRanking('leaderboard',1,'',{query:'Alex'});
  assert.equal(result.items[0].public_id,id);
  assert.equal(attempts,2);
});

test('a profile restarts a revision change and reads multiple history pages', async t => {
  let revision = 5;
  mockSite(t, async raw => {
    const url = new URL(raw);
    if (!url.pathname.endsWith('/history')) return json({revision, profile: {public_id: id, summary: {}},
      histories: {race_history: {total: 1003, stream: 'race_history'}}});
    const expected = Number(url.searchParams.get('revision'));
    const page = Number(url.searchParams.get('page'));
    if (expected === 5) {
      revision = 6;
      return json({error: 'stats_revision_changed'}, 409);
    }
    const limit = Number(url.searchParams.get('limit'));
    const start = (page - 1) * limit;
    return json({revision, page, kind: 'race_history', total_items: 1003,
      items: Array.from({length: Math.min(limit, 1003 - start)}, (_, i) => start + i)});
  });
  const profile = await liveDriverProfile(id);
  assert.deepEqual(profile.race_history, Array.from({length: 1003}, (_, index) => index));
});

test('legacy snapshots are selected only on an explicit rollback response', async t => {
  const request = async () => json({error: 'stats_legacy'}, 503);
  mockSite(t, request);
  assert.equal(await liveDriverProfile(id), null);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => json({error: 'not_ready'}, 503));
  await assert.rejects(liveRanking('safety', 1, ''), {status: 503});
});

test('recent Hourly results use one archive revision across the race formats', async t => {
  let reads = 0;
  const kinds = ['hourly', 'monoclass', 'endurance', 'championship'];
  mockSite(t, async raw => {
    const kind = new URL(raw).searchParams.get('kind');
    const number = kinds.indexOf(kind) + 1;
    assert.ok(number > 0);
    reads++;
    return json({schema:1, revision:reads===1?3:4, generated_at:'2026-11-10T20:00:00Z',
      page:1, total_pages:1, total_items:1, archive_total:14, items:[
        {race_id:String(number).padStart(16,'0'), kind, source:number===2?'main':'hourly',
          finished_at:`2026-11-0${number}T20:00:00Z`},
      ]});
  });
  const rows = await readRecentHourlyRaces('site');
  assert.deepEqual(rows.map(row=>row.kind), ['championship','endurance','hourly']);
  assert.equal(reads, 8);
});
