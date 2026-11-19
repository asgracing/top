import {safetyHistoryComponents} from './safety-history.js?v=20261010profile1';

export const srNumber=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))?Number(value):null;
const first=(...values)=>values.map(srNumber).find(value=>value!==null)??null;
const rounded=value=>Math.round((value+Number.EPSILON)*100)/100;
const filename=value=>String(value||'').split(/[\\/]/).pop().toLowerCase();

// The ledger owns the rating and delta; race protocols only fill in evidence.
export function driverSafetyRaces(profile) {
  const history=profile?.safety_history??profile?.summary?.safety_history??[];
  const races=Array.isArray(profile?.race_history)?profile.race_history:[];
  const byId=new Map(races.map(r=>[r.race_id,r]));
  const byFile=new Map(races.filter(r=>r.source_file||r.race_file).map(r=>[filename(r.source_file||r.race_file),r]));
  return (Array.isArray(history)?history:[]).map((ledger,index)=>{
    const race=byId.get(ledger.race_id)||byFile.get(filename(ledger.race_file))||{};
    const after=first(ledger.new_sr,ledger.safety_rating,race.safety_rating_after);
    const delta=first(ledger.delta_sr,ledger.safety_delta,race.safety_delta);
    const before=first(ledger.old_sr,race.safety_rating_before,after!==null&&delta!==null?rounded(after-delta):null);
    return {key:String(ledger.race_id||'history-'+index),raceId:ledger.race_id||race.race_id||null,
      finishedAt:ledger.finished_at||race.finished_at||null,track:ledger.track||race.track_code||race.track||'',
      before,after,delta,ledger,race,index};
  }).filter(r=>r.after!==null).sort((a,b)=>(Date.parse(a.finishedAt)||0)-(Date.parse(b.finishedAt)||0)||a.index-b.index);
}

export function safetyPeriodRaces(records,period='30',now=Date.now()) {
  if(period==='all')return [...records];
  const days=['7','30','90'].includes(String(period))?Number(period):30;
  const cutoff=now-days*86400000;
  return records.filter(r=>{const date=Date.parse(r.finishedAt);return Number.isFinite(date)&&date>=cutoff&&date<=now;});
}

export function safetyListRaces(records,filter='all') {
  return [...records].reverse().filter(r=>filter==='gain'?r.delta>0:filter==='loss'?r.delta<0:filter==='zero'?r.delta===0:true);
}

function protocolFromRace(race) {
  return {clean:srNumber(race.safety_base_delta),incidents:srNumber(race.safety_incident_penalty_delta),
    penalties:srNumber(race.safety_penalty_delta),rating:first(race.safety_rating_after,race.safety_rating),
    delta:first(race.safety_delta,race.safety_final_delta)};
}

function boundedProtocol(record,protocol) {
  if(!protocol)return null;
  const rating=srNumber(protocol.rating),delta=srNumber(protocol.delta);
  // Some older protocols expose the result before clamping in final_delta.
  // Accept this only when the ledger's before/after proves the same boundary.
  if(record.before!==null&&record.delta!==null&&rating!==null&&delta!==null&&
    Math.abs(rating-record.after)<.00001&&[1,9.99].includes(record.after)&&
    Math.abs(rounded(Math.min(9.99,Math.max(1,record.before+delta)))-record.after)<.00001&&
    Math.abs(rounded(record.after-record.before)-record.delta)<.00001) {
    return {...protocol,delta:record.delta};
  }
  return protocol;
}

function publishedIncidentEpisodes(ledger) {
  const {incident_episodes: episodes, incident_points: count, incident_deduction: total}=ledger;
  if(!Array.isArray(episodes)||episodes.length!==count||!Number.isFinite(total))return null;
  if(!episodes.every(row=>row&&['contact','damage'].includes(row.kind)
    &&[.01,.02,.07,.25].includes(row.deduction)
    &&(row.damage_growth===null||(Number.isFinite(row.damage_growth)&&row.damage_growth>=0))))return null;
  return rounded(episodes.reduce((sum,row)=>sum+row.deduction,0))===rounded(total)?episodes:null;
}

export function driverSafetyBreakdown(record,extra=null) {
  const ledger={...record.ledger,new_sr:record.after,delta_sr:record.delta};
  const versionConflict=Boolean(ledger.calculation_version&&record.race.safety_calculation_version&&
    ledger.calculation_version!==record.race.safety_calculation_version);
  const local=versionConflict?null:boundedProtocol(record,protocolFromRace(record.race));
  const localValues=safetyHistoryComponents(ledger,local);
  const remote=boundedProtocol(record,extra);
  const remoteValues=remote?safetyHistoryComponents(ledger,remote):null;
  const safeRemote=remoteValues&&!remoteValues.stale?remote:null;
  const source=localValues.stale?safeRemote:local;
  const combined=source?{...source,clean:first(source.clean,safeRemote?.clean),
    incidents:first(source.incidents,safeRemote?.incidents),penalties:first(source.penalties,safeRemote?.penalties)}:null;
  const values=safetyHistoryComponents(ledger,combined);
  const stale=versionConflict||localValues.stale||Boolean(remoteValues?.stale);
  const context=versionConflict||localValues.stale?{}:record.race;
  const version=ledger.calculation_version||context.safety_calculation_version||null;
  const variantA=version==='sr_variant_a_v1';
  const completed=first(record.ledger.completed_laps,context.safety_completed_laps);
  const leader=first(context.safety_leader_laps,ledger.leader_laps);
  const invalid=first(record.ledger.invalid_laps,context.safety_invalid_laps);
  const valid=first(ledger.valid_laps,context.safety_valid_laps);
  const unknown=variantA?first(ledger.unknown_laps,context.safety_unknown_laps):null;
  const coverage=ledger.incident_coverage||context.safety_incident_coverage||null;
  const distanceBonus=variantA?first(ledger.distance_bonus,context.safety_distance_bonus):null;
  const incidentDeduction=variantA?first(ledger.incident_deduction,context.safety_incident_deduction):null;
  const enough=context.safety_enough_distance??(variantA?null:(completed!==null&&leader>0?completed/leader>=.5:null));
  const componentSum=[values.clean,values.incidents,values.penalties].every(v=>v!==null)
    ?rounded(values.clean+values.incidents+values.penalties):null;
  const raw=first(variantA?context.safety_raw_delta:null,componentSum);
  const computed=first(context.safety_final_delta,raw);
  const bounded=record.before!==null&&computed!==null&&record.delta!==null&&
    Math.abs(rounded(Math.min(9.99,Math.max(1,record.before+computed)))-record.after)<.00001;
  const cap=bounded&&((record.after===9.99&&computed>record.delta+.005)||(record.after===1&&computed<record.delta-.005));
  return {...values,stale,context,completed,leader,invalid,valid,unknown,enough,version,variantA,coverage,
    distanceBonus,incidentDeduction,raw,computed,cap,
    incidentEpisodes:variantA?publishedIncidentEpisodes(ledger):null,
    incidents:first(record.ledger.incident_points,context.safety_incident_points),
    penalties:first(record.ledger.counted_penalties_count,context.safety_counted_penalties),
    ignored:first(record.ledger.ignored_penalties_count,context.safety_ignored_penalties),
    clean:values.clean,incidentDelta:values.incidents,penaltyDelta:values.penalties,
    missing:[values.clean,values.incidents,values.penalties].some(v=>v===null)};
}
