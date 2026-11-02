import test from 'node:test';
import assert from 'node:assert/strict';
import { activityPage, activityPageForDate, buildActivityHistory, buildActivityComparison } from '../../v2/online-activity-model.js';

test('Monthly history keeps year boundaries and exact daily averages', () => {
  const periods = buildActivityHistory([
    {date:'2025-12-28',unique_players:20},
    {date:'2025-12-29',unique_players:30},
    {date:'2026-01-04',unique_players:50},
    {date:'2026-01-05',unique_players:70}
  ],'months');
  assert.deepEqual(periods.map(p=>[p.start,p.end]),[
    ['2025-12-01','2025-12-31'],['2026-01-01','2026-01-31']
  ]);
  assert.equal(periods[1].average,60);
  assert.equal(periods[1].maximum,70);
  assert.equal(periods[1].peakDate,'2026-01-05');
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

test('No monthly unique total is invented from daily counts', () => {
  const days=Array.from({length:7},(_,i)=>({date:`2026-11-${String(i+2).padStart(2,'0')}`,unique_players:100}));
  const [week]=buildActivityHistory(days,'months');
  assert.equal(week.average,100);
  assert.equal(week.maximum,100);
  assert.equal(week.observedDays,7);
  assert.equal(week.partial,true);
  assert.equal(week.calendarDays,30);
  assert.throws(()=>buildActivityHistory(days,'weeks'),/Unknown activity scale/);
});

test('Daily overview compares with previous calendar days and never includes today in the baseline',()=>{
  const days=Array.from({length:8},(_,i)=>({date:`2026-11-${String(i+1).padStart(2,'0')}`,unique_players:i===7?200:100}));
  const stats=buildActivityComparison(days,7,'2026-11-08');
  assert.equal(stats.average,100);
  assert.equal(stats.averageDifference.percent,100);
  assert.equal(stats.averageDifference.absolute,100);
  assert.equal(stats.yesterdayDifference.percent,100);
  assert.equal(stats.strongerThan,7);
  assert.equal(stats.measuredDays,7);
  assert.equal(stats.isToday,true);
});

test('Missing yesterday is unknown and gaps reduce comparison coverage without becoming zeroes',()=>{
  const stats=buildActivityComparison([{date:'2026-11-01',unique_players:0},{date:'2026-11-03',unique_players:60},{date:'2026-11-05',unique_players:90}],7,'2026-11-05');
  assert.equal(stats.average,30);
  assert.equal(stats.measuredDays,2);
  assert.equal(stats.yesterday,null);
  assert.equal(stats.yesterdayDifference,null);
  assert.equal(stats.averageDifference.percent,200);
  assert.equal(stats.strongerThan,2);
});

test('A zero baseline produces an absolute increase instead of an infinite percentage',()=>{
  const stats=buildActivityComparison([{date:'2026-11-01',unique_players:0},{date:'2026-11-02',unique_players:40}],7,'2026-11-02');
  assert.deepEqual(stats.averageDifference,{absolute:40,percent:null});
  assert.equal(stats.yesterdayDifference.percent,null);
});

test('Overview changes its calendar window, excludes future data and marks stale publication dates',()=>{
  const days=Array.from({length:31},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,unique_players:i}));
  assert.equal(buildActivityComparison(days,7,'2026-11-02').average,26);
  assert.equal(buildActivityComparison(days,14,'2026-11-02').average,22.5);
  assert.equal(buildActivityComparison(days,30,'2026-11-02').average,14.5);
  assert.equal(buildActivityComparison(days,30,'2026-11-02').isToday,false);
  assert.equal(buildActivityComparison(days,7,'2026-10-20').current.start,'2026-10-20');
  assert.equal(buildActivityComparison([],7,'2026-11-02'),null);
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
