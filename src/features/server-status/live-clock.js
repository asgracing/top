// NTP midpoint estimate against a public GET endpoint, on performance.now().
const finite = value => typeof value === 'number' && Number.isFinite(value);
export const CLOCK_MAX_AGE_MS = 15000;
// Browser RTT includes the public Internet; a 50 ms bound rejected ordinary
// 140–150 ms round trips and hid every marker despite a healthy source.
export const CLOCK_MAX_UNCERTAINTY_MS = 150;

export class LiveClock {
  constructor(){this.samples=[];}
  observe(sent,received,reply) {
    const first=reply?.received_ms,last=reply?.sent_ms;
    if (!finite(sent)||!finite(received)||received<sent||received-sent>5000
        || !Number.isSafeInteger(first)||!Number.isSafeInteger(last)||last<first||last-first>1000) throw Error('Invalid clock exchange');
    const rtt=received-sent-(last-first),uncertainty=Math.max(0,rtt)/2+1;
    if(rtt< -2||uncertainty>CLOCK_MAX_UNCERTAINTY_MS) throw Error('Uncertain clock exchange');
    const value={offset_ms:((first-sent)+(last-received))/2,uncertainty_ms:uncertainty,measured_at:received};
    const previous=this.current(received);
    if(previous&&Math.abs(value.offset_ms-previous.offset_ms)>100)this.samples=[];
    this.samples.push(value);this.samples=this.samples.filter(v=>received-v.measured_at<=CLOCK_MAX_AGE_MS).slice(-6);
    return this.current(received);
  }
  current(now) {
    const valid=this.samples.filter(v=>now>=v.measured_at&&now-v.measured_at<=CLOCK_MAX_AGE_MS);
    return valid.reduce((best,value)=>!best||value.uncertainty_ms<best.uncertainty_ms?value:best,null);
  }
}

export async function measureLiveClock(fetchImpl,clock,signal) {
  const sent=clock();
  const reply=await fetchImpl('https://data.asgracing.ru/telemetry/v1/clock',{cache:'no-store',credentials:'omit',signal});
  if(!reply.ok)throw Error('Clock endpoint unavailable');
  const raw=await reply.text(),received=clock();
  if(raw.length>1024)throw Error('Clock response exceeds limit');
  return {sent,received,reply:JSON.parse(raw)};
}
