import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUNITY_SECTIONS,RACING_SECTIONS,PENALTY_SECTIONS,PENALTY_NOTES,RULE_LINKS,COPYRIGHT} from '../../src/features/rules/rules-content.js';
import {renderRules,submissionTemplate} from '../../src/features/rules/rules-view.js';

test('rulebook preserves every supplied community provision and penalty row in RU/EN',()=>{
  assert.deepEqual(COMMUNITY_SECTIONS.map(s=>s.items.length),[7,6,10]);
  assert.deepEqual(PENALTY_SECTIONS.map(s=>s.items.length),[13,8,6]);
  assert.equal(RACING_SECTIONS.find(s=>s.id==='track-main').items.length,16);
  assert.equal(RACING_SECTIONS.find(s=>s.id==='track-overtake').items.length,7);
  for(const section of [...COMMUNITY_SECTIONS,...RACING_SECTIONS,...PENALTY_SECTIONS]){
    for(const lang of ['ru','en']){
      assert.ok(section.title[lang]);
      for(const row of section.items){assert.ok(row.text[lang]);if(row.penalty)assert.ok(row.penalty[lang]);}
    }
  }
  assert.match(COMMUNITY_SECTIONS[1].items.at(-1).text.ru,/независимо от того/);
  assert.match(COMMUNITY_SECTIONS[2].items.at(-1).text.ru,/«Этого не было в правилах»/);
});
test('confirmed return deadline, track limits and October sanctions supersede August text',()=>{
  const main=RACING_SECTIONS[0].items;
  assert.match(main.find(r=>r.code==='1.11').text.ru,/в течение одного круга/);
  assert.match(main.find(r=>r.code==='1.11').text.ru,/5 секунд/);
  assert.match(main.find(r=>r.code==='1.12').text.ru,/менее двух колёс/);
  assert.equal(PENALTY_SECTIONS[0].items.find(r=>r.code==='2.8').penalty.ru,'10 секунд');
  assert.equal(PENALTY_SECTIONS[0].items.find(r=>r.code==='2.3').penalty.ru,'5 секунд');
  assert.match(PENALTY_NOTES[0].ru,/одного круга/);
  assert.match(PENALTY_NOTES[2].ru,/±20%/);
});
test('templates retain all nine report and eight appeal fields and reject unknown kinds',()=>{
  for(const lang of ['ru','en']){
    assert.equal(submissionTemplate('report',lang).split('\n').length,9);
    assert.equal(submissionTemplate('protest',lang).split('\n').length,8);
    assert.match(submissionTemplate('report',lang),/415.*221/);
  }
  assert.throws(()=>submissionTemplate('__proto__'),/Unknown/);
  assert.throws(()=>submissionTemplate('constructor'),/Unknown/);
});
test('rendered reader has accessible tabs, hidden panels, three tables and safe links',()=>{
  for(const lang of ['ru','en']){
    const html=renderRules(lang);
    assert.equal((html.match(/role="tab"/g)||[]).length,4);
    assert.equal((html.match(/role="tabpanel"/g)||[]).length,4);
    assert.equal((html.match(/tabindex="0" hidden/g)||[]).length,3);
    assert.equal((html.match(/<table>/g)||[]).length,3);
    assert.equal((html.match(/<textarea /g)||[]).length,2);
    assert.match(html,/data-rules-copy="report"/);
    assert.match(html,/data-rules-copy="protest"/);
    assert.ok(html.includes(COPYRIGHT[lang]));
    assert.equal(new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])).size,[...html.matchAll(/\bid="([^"]+)"/g)].length);
    for(const link of Object.values(RULE_LINKS)){assert.equal(new URL(link).protocol,'https:');assert.equal(new URL(link).hostname,'discord.com');}
    assert.doesNotMatch(html,/<script|onerror=|javascript:/i);
  }
});
