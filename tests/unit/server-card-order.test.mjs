import assert from 'node:assert/strict';
import test from 'node:test';

import {countReportedPlayers, orderedServers} from '../../v2/server-cards.js';
import {serverCountryFlag, serverTrackCountry} from '../../v2/server-track-flags.js';

test('all 25 ACC tracks resolve to the corresponding country and a vector flag', () => {
  const tracks = {
    barcelona:'ES', brands_hatch:'GB', cota:'US', donington:'GB', hungaroring:'HU', imola:'IT',
    indianapolis:'US', kyalami:'ZA', laguna_seca:'US', misano:'IT', monza:'IT', mount_panorama:'AU',
    nurburgring:'DE', nurburgring_24h:'DE', oulton_park:'GB', paul_ricard:'FR', red_bull_ring:'AT',
    silverstone:'GB', snetterton:'GB', spa:'BE', suzuka:'JP', valencia:'ES', watkins_glen:'US',
    zandvoort:'NL', zolder:'BE',
  };
  for (const [track, country] of Object.entries(tracks)) {
    assert.equal(serverTrackCountry(track), country, track);
    assert.match(serverCountryFlag(country), /<svg[^>]+><(?:rect|path|g)\b/);
  }
  assert.equal(serverTrackCountry('Nürburgring 24h'), 'DE');
  assert.equal(serverTrackCountry('nordschl'), 'DE');
  assert.equal(serverTrackCountry('monzaTG.jpg'), 'IT');
  assert.equal(serverTrackCountry('unknown_track'), null);
});

test('server cards pin Hourly and Main, then use player count and the existing track order', () => {
  // The runtime has already sorted the input by track and name.
  const servers = [
    {key: 'hourly', players: null},
    {key: 'barcelona', players: 5},
    {key: 'main', players: 0},
    {key: 'monza-practice', players: 5},
    {key: 'sunset', players: 2},
    {key: 'nurburgring', players: 12},
    {key: 'spa', players: null}
  ];

  assert.deepEqual(orderedServers(servers).map(row => row.key),
    ['hourly', 'main', 'nurburgring', 'barcelona', 'monza-practice', 'sunset', 'spa']);
  assert.equal(servers[2].key, 'main');
  assert.deepEqual(orderedServers(servers.map(row =>
    row.key === 'sunset' ? {...row, players: 18} : row)).map(row => row.key).slice(0, 4),
    ['hourly', 'main', 'sunset', 'nurburgring']);
});

test('player totals include available counts when other server data is stale or missing', () => {
  const servers = [
    {players: 5, stale: false},
    {players: 99, stale: true},
    {players: null, stale: false},
    {players: 3, stale: false}
  ];

  assert.equal(countReportedPlayers(servers, false), 8);
  assert.equal(countReportedPlayers(servers, true), null);
  assert.equal(countReportedPlayers([{players: 0}, {players: 99, stale: true}], false), 0);
  assert.equal(countReportedPlayers([{players: null}, {players: 99, stale: true}], false), null);
  assert.equal(countReportedPlayers([], false), null);
});
