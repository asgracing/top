import assert from 'node:assert/strict';
import test from 'node:test';

import {orderedServers} from '../../v2/server-cards.js';

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
