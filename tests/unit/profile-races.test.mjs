import test from 'node:test';
import assert from 'node:assert/strict';
import {profileRaces} from '../../v2/profile-races.js';
const options={trackName:value=>value,date:value=>value};
const rows=[
 {race_id:'excluded',counted_for_stats:false,track:'spa',finished_at:'2026-10-25',position:1},
 {race_id:'unknown',track:'monza',finished_at:'2026-10-24',position:4},
 {race_id:'counted',counted_for_stats:true,track:'spa',finished_at:'2026-10-23',position:2}
];
test('profile hides only explicitly uncounted races by default without changing source history',()=>{
 const copy=structuredClone(rows);
 assert.deepEqual(profileRaces(rows,options).map(r=>r.race_id),['unknown','counted']);
 assert.deepEqual(rows,copy);
});
test('visibility composes with search and finishing order before pagination',()=>{
 assert.deepEqual(profileRaces(rows,{...options,showUncounted:true,query:'SPA',sort:'position'}).map(r=>r.race_id),['excluded','counted']);
 assert.deepEqual(profileRaces(rows,{...options,query:'spa'}).map(r=>r.race_id),['counted']);
 assert.deepEqual(profileRaces(undefined,options),[]);
});
