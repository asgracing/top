import assert from 'node:assert/strict';
import test from 'node:test';
import {raceResultUrl, raceLinkSummary} from '../../src/shared/race-result-links.js';
import {renderResultTabs, renderRaceCopyButton} from '../../src/shared/race-result-context.js';
const api={tx:(ru,en)=>en,label:String};
const parse=value=>raceLinkSummary(new URL(value).searchParams);
test('archive, driver and entity results share a public canonical ID',()=>{
  for(const source of ['top','entity',undefined]) {
    const url=raceResultUrl({race_id:'9ed4184213cda17e',_data_namespace:source,details_path:'races/details/9ed4184213cda17e.json'});
    assert.equal(url,'https://asgracing.ru/race/?id=9ed4184213cda17e');
    assert.equal(parse(url)._data_namespace,'top');
  }
});
test('Hourly and special event links retain their distinct namespace and active tab',()=>{
  const url=raceResultUrl({race_id:'hourly_test',_data_namespace:'hourly'},'qualifying','en');
  assert.equal(url,'https://asgracing.ru/en/race/?id=hourly_test&source=hourly&tab=qualifying');
  assert.equal(parse(url)._data_namespace,'hourly');
});
test('championship keeps the event protocol, season points and independent published race reference',()=>{
  const race={race_id:'hourly_2026-10-02_2132_spa',_data_namespace:'season',_season_slug:'october-2026',details_path:'races/hourly_2026-10-02_2132_spa.json',_published_race:{race_id:'3780c6ea0a28918a',details_path:'races/3780c6ea0a28918a.json'}};
  const summary=parse(raceResultUrl(race,'qualifying'));
  assert.equal(summary.race_id,race.race_id);assert.equal(summary._season_slug,'october-2026');
  assert.deepEqual(summary._published_race,race._published_race);
});
test('nonstandard relative protocol filenames survive copying',()=>{
  const race={race_id:'event1',_data_namespace:'season',_season_slug:'season',details_path:'races/round-1.json',_published_race:{race_id:'official1',details_path:'races/official/round-1.json'}};
  const summary=parse(raceResultUrl(race));
  assert.equal(summary.details_path,race.details_path);assert.deepEqual(summary._published_race,race._published_race);
});
test('public loader rejects unknown namespaces, external paths and traversal',()=>{
  for(const query of ['id=x&source=private','id=../x','id=x&source=season','id=x&source=season&season=../foo','id=x&file=../private.json','id=x&file=races/../private.json','id=x&file=https://evil.test/races/x.json','id=x&file=races/%2fsecret.json','id=x&published_file=races/a.json'])assert.throws(()=>raceLinkSummary(new URLSearchParams(query)),{status:404});
});
test('qualifying deep link selects its accessible panel immediately, including missing data',()=>{
  const html=renderResultTabs({},'race',{...api,resultTab:'qualifying'});
  assert.match(html,/data-result-panel="race" hidden/);assert.match(html,/data-result-panel="qualifying">/);
  assert.match(html,/aria-selected="true" tabindex="0" data-result-tab="qualifying"/);
  assert.match(html,/Qualifying data is unavailable/);
});
test('copy control appears only for a complete public reference',()=>{
  assert.match(renderRaceCopyButton({race_id:'race1'},api),/Copy link/);
  assert.equal(renderRaceCopyButton({},api),'');
});
