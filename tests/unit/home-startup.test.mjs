import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {watchHomeVersion} from '../../v2/site-config.js';
import {useStyles} from '../../v2/membership/styles.js';
const source=await readFile(new URL('../../v2/home-startup.js',import.meta.url),'utf8');
const flush=()=>new Promise(setImmediate);

function startup({preview,fetcher}={}){
  const names=new Set(),root={dataset:{},classList:{add:(...values)=>values.forEach(v=>names.add(v)),remove:(...values)=>values.forEach(v=>names.delete(v))}};
  const shell={inert:true},loader={hidden:false},timers=new Map();let id=0,calls=0;
  const window={frameElement:preview?{hasAttribute:()=>true,getAttribute:()=>preview}:null};
  const document={head:{append(){}},createElement:()=>({}),documentElement:root,getElementById:()=>shell,querySelector:selector=>selector==='.home-loader'?loader:null};
  vm.runInNewContext(source,{window,document,Promise,AbortController,fetch:(...args)=>{calls++;return fetcher(...args);},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:timer=>timers.delete(timer)});
  return {window,root,shell,loader,names,timers,calls:()=>calls,fire(ms){for(const [key,value]of timers)if(value.ms===ms){timers.delete(key);value.fn();break;}}};
}

test('first paint stays neutral until renderer finishes; config starts before main module',async()=>{
  let resolve;
  const s=startup({fetcher:(_url,options)=>{assert.equal(options.credentials,'omit');return new Promise(r=>resolve=r);}});
  assert.equal(s.calls(),1);assert.ok(s.names.has('asg-home-layout-pending'));
  resolve({ok:true,json:async()=>({home_version:'membership'})});
  assert.equal((await s.window.asgHomeStartup.config).home_version,'membership');
  assert.ok(s.names.has('asg-home-layout-pending'),'API readiness alone must not reveal old HTML');
  s.window.asgHomeStartup.finish();
  assert.equal(s.names.has('asg-home-layout-pending'),false);assert.equal(s.shell.inert,false);assert.equal(s.loader.hidden,true);
});

test('mobile config may take longer than 2.5 seconds without selecting the old layout',async()=>{
  let resolve,signal;
  const s=startup({fetcher:(_url,options)=>{signal=options.signal;return new Promise(r=>resolve=r);}});
  s.fire(2500);
  assert.equal(signal.aborted,false);
  assert.ok(s.names.has('asg-home-layout-pending'));
  resolve({ok:true,json:async()=>({home_version:'membership'})});
  assert.equal((await s.window.asgHomeStartup.config).home_version,'membership');
  s.window.asgHomeStartup.finish();
});

test('hung request settles once; a late successful response cannot change initial fallback',async()=>{
  let resolve,signal;
  const s=startup({fetcher:(_url,options)=>{signal=options.signal;return new Promise(r=>resolve=r);}});
  s.fire(8000);assert.equal(signal.aborted,true);assert.equal(await s.window.asgHomeStartup.config,null);
  resolve({ok:true,json:async()=>({home_version:'membership'})});await flush();
  assert.equal(await s.window.asgHomeStartup.config,null);assert.ok(s.names.has('asg-home-layout-pending'));
  s.fire(20000);assert.equal(s.root.dataset.homeVersion,'current');assert.equal(s.root.dataset.homeLayoutState,'fallback');assert.equal(s.window.asgHomeStartup.expired,true);
  assert.equal(s.names.has('asg-home-layout-pending'),false);
});

test('HTTP error and synchronous fetch failure resolve to safe config; iframe preview avoids public read',async()=>{
  for(const fetcher of [async()=>({ok:false}),()=>{throw Error('offline');}]){
    const s=startup({fetcher});assert.equal(await s.window.asgHomeStartup.config,null);s.window.asgHomeStartup.finish();
  }
  const s=startup({preview:'membership',fetcher:()=>{throw Error('unexpected request');}});
  assert.equal(s.calls(),0);assert.equal((await s.window.asgHomeStartup.config).home_version,'membership');s.window.asgHomeStartup.finish();
});

test('watcher reuses early config even in background and does not reread on ordinary pageshow',async t=>{
  const before={document:globalThis.document,window:globalThis.window};
  const doc=new EventTarget(),win=new EventTarget();doc.hidden=true;globalThis.document=doc;globalThis.window=win;
  let calls=0;const seen=[];
  const stop=watchHomeVersion(value=>seen.push(value),{initial:Promise.resolve({home_version:'membership'}),fetcher:async()=>{calls++;return {ok:true,json:async()=>({home_version:'current'})};}});
  t.after(()=>{stop();Object.assign(globalThis,before);});await flush();assert.deepEqual(seen,['membership']);assert.equal(calls,0);
  doc.hidden=false;win.dispatchEvent(new Event('pageshow'));await flush();assert.equal(calls,0);
  win.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));await flush();assert.equal(calls,1);assert.deepEqual(seen,['membership','current']);
});

test('critical styles wait for load, report failure and can be cancelled without a hanging promise',async t=>{
  const before=globalThis.document,links=[];
  class Link extends EventTarget {remove(){this.removed=true;}}
  globalThis.document={createElement:()=>new Link(),head:{append:link=>links.push(link)}};
  t.after(()=>{globalThis.document=before;});
  const ok=useStyles('home.css');let finished=false;ok.ready.then(()=>finished=true);await flush();assert.equal(finished,false);
  links[0].dispatchEvent(new Event('load'));assert.equal(await ok.ready,true);ok();assert.equal(links[0].removed,true);
  const bad=useStyles('native-pass.css');links[1].dispatchEvent(new Event('error'));assert.equal(await bad.ready,false);bad();
  const cancelled=useStyles('home.css');cancelled();assert.equal(await cancelled.ready,false);
});
