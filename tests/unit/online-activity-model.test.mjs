import test from 'node:test';
import assert from 'node:assert/strict';
import { activityPage, activityPageForDate, buildActivityHistory } from '../../v2/online-activity-model.js';

test('Weekly history uses Monday to Sunday across year boundaries', () => {
  const periods = buildActivityHistory([
    {date:'2025-12-28',unique_players:20},
    {date:'2025-12-29',unique_players:30},
    {date:'2026-01-04',unique_players:50},
    {date:'2026-01-05',unique_players:70}
  ],'weeks');
  assert.deepEqual(periods.map(p=>[p.start,p.end]),[
    ['2025-12-22','2025-12-28'],['2025-12-29','2026-01-04'],['2026-01-05','2026-01-11']
  ]);
  assert.equal(periods[1].average,40);
  assert.equal(periods[1].maximum,50);
  assert.equal(periods[1].peakDate,'2026-01-04');
});

test('Missing days stay unknown while published zeroes count toward the average', () => {
  const days = [{date:'2026-11-01',unique_players:0,races:0},{date:'2026-11-03',unique_players:90,races:5}];
  const daily=buildActivityHistory(days);
  assert.equal(daily[1].average,null);
  assert.equal(daily[1].maximum,null);
  const [month]=buildActivityHistory(days,'months');
  assert.equal(month.average,45);
  assert.equal(month.maximum,90);
  assert.equal(month.observedDays,2);
  assert.equal(month.races,5);
  assert.equal(month.partial,true);
});

test('No weekly or monthly unique total is invented from daily counts', () => {
  const days=Array.from({length:7},(_,i)=>({date:`2026-11-${String(i+2).padStart(2,'0')}`,unique_players:100}));
  const [week]=buildActivityHistory(days,'weeks');
  assert.equal(week.average,100);
  assert.equal(week.maximum,100);
  assert.equal(week.observedDays,7);
  assert.equal(week.partial,false);
  assert.equal(week.calendarDays,7);
});

test('Calendar months include leap day and daylight-saving dates without shifting date keys', () => {
  const periods=buildActivityHistory([{date:'2024-02-29',unique_players:1},{date:'2024-03-31',unique_players:3}],'months');
  assert.deepEqual(periods.map(p=>[p.start,p.end,p.calendarDays]),[
    ['2024-02-01','2024-02-29',29],['2024-03-01','2024-03-31',31]
  ]);
});

test('Out-of-order dates, duplicate dates and invalid values do not inflate history', () => {
  const raw=[{date:'2026-06-03',unique_players:8},{date:'2026-06-01',unique_players:7},
    {date:'2026-06-01',unique_players:9},{date:'2026-06-02',unique_players:null},
    {date:'2026-06-04',unique_players:-1},{date:'2026-02-30',unique_players:100}];
  const original=JSON.stringify(raw),days=buildActivityHistory(raw);
  assert.deepEqual(days.map(p=>p.average),[9,null,8,null]);
  const [month]=buildActivityHistory(raw,'months');
  assert.equal(month.average,8.5);
  assert.equal(month.observedDays,2);
  assert.equal(JSON.stringify(raw),original);
});

test('Empty calendar periods are visible rather than silently joining distant dates', () => {
  const periods=buildActivityHistory([{date:'2026-01-31',unique_players:15},{date:'2026-03-01',unique_players:20}],'months');
  assert.equal(periods.length,3);
  assert.equal(periods[1].average,null);
  assert.equal(periods[1].races,null);
});

test('Historical pages have stable boundaries, and selecting an old date finds its page', () => {
  const periods=buildActivityHistory([{date:'2026-10-01',unique_players:1},{date:'2026-11-02',unique_players:2}]);
  const newest=activityPage(periods,0),older=activityPage(periods,1),oldest=activityPage(periods,99);
  assert.equal(newest.periods.at(-1).start,'2026-11-02');
  assert.equal(newest.periods[0].start,'2026-10-20');
  assert.equal(older.periods.at(-1).start,'2026-10-19');
  assert.equal(oldest.periods[0].start,'2026-10-01');
  assert.equal(oldest.page,2);
  assert.equal(activityPageForDate(periods,'2026-10-01'),2);
  assert.equal(activityPageForDate(periods,'2026-10-20'),0);
});
