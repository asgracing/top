// Design-only fixture. This directory is excluded from the site release.
(() => {
  const scenario = new URLSearchParams(location.search).get('scenario') || 'new';
  const members = [
    {public_id:'drv_demo_a',display_name:'Алексей · Alex',race_number:27,eligible:true},
    {public_id:'drv_demo_b',display_name:'Мария · Maria',race_number:84,eligible:true},
    {public_id:'drv_demo_c',display_name:'Дмитрий · Dmitry',race_number:145,eligible:true},
    {public_id:'drv_demo_d',display_name:'Пилот без допуска · Ineligible driver',race_number:null,eligible:false}
  ];
  if (scenario === 'number') members[0].race_number = null;
  const actor = scenario === 'waiting' ? members[1] : members[0];
  const team = {team_id:'tm_demo',team_name:'ASG Racing Demo Team',members};
  const event = {occurrence_id:'fixture',event_id:'fixture-event',title:'Spa · командная часовая гонка',track_name:'Spa-Francorchamps',participation_mode:'team',launch_at:'2099-10-10T16:00:00Z',closes_at:'2099-10-10T15:00:00Z',registration_closed:scenario==='closed',max_drivers:3,max_cars:24,max_connections:72,allowed_car_models:[30,32,34,35],registrations:[]};
  let registration = ['waiting','confirmed','closed'].includes(scenario) ? {team_id:team.team_id,team_name:team.team_name,registered_by_public_id:members[0].public_id,captain_public_id:members[0].public_id,car_model:32,race_number:27,version:1,status:scenario==='waiting'?'pending':'confirmed',roster:members.slice(0,2).map((p,i)=>({...p,confirmed:scenario!=='waiting'||i===0}))} : null;
  let requestCount = 0;
  const commands = new Map(), keys = new Map(), realFetch = window.fetch.bind(window);
  try { sessionStorage.removeItem('asg-team-racing:fixture:' + actor.public_id); } catch {}
  const json = (data,status=200) => Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));
  window.fetch = (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin === location.origin) return realFetch(input,options);
    if (url.pathname === '/v1/me') return json(scenario === 'guest' ? {authenticated:false} : {authenticated:true,driver:actor,csrf_token:'demo-only-csrf'});
    if (url.pathname === '/v1/team-racing/events') return json({events:[{...event,registrations:registration?[registration]:[]}],teams:['guest','no-team'].includes(scenario)?[]:[team],stale:scenario==='stale'});
    if (url.pathname === '/v1/team-racing/commands' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      if (keys.has(body.idempotency_key)) return json({command:{command_id:keys.get(body.idempotency_key)}});
      const commandId = 'demo-' + (++requestCount); keys.set(body.idempotency_key,commandId);
      if (body.action === 'register' || body.action === 'update') registration = {...body.payload,team_name:team.team_name,registered_by_public_id:actor.public_id,race_number:members.find(p=>p.public_id===body.payload.captain_public_id).race_number,version:(registration?.version||0)+1,roster:body.payload.roster.map(id=>({...members.find(p=>p.public_id===id),confirmed:id===actor.public_id}))};
      if (body.action === 'confirm') { registration.roster.find(p=>p.public_id===actor.public_id).confirmed=true; registration.version++; }
      if (body.action === 'withdraw') registration = null;
      if (registration) registration.status = registration.roster.every(p=>p.confirmed)?'confirmed':'pending';
      commands.set(commandId,{status:'applied'}); return json({command:{command_id:commandId}},202);
    }
    if (url.pathname.startsWith('/v1/team-racing/commands/')) return json({command:commands.get(url.pathname.split('/').pop()) || {status:'pending'}});
    return json({items:[]});
  };
  document.addEventListener('click', click => {
    const anchor = click.target.closest('a');
    // Never leave the fixture for a native page that could access live APIs.
    if (anchor && !anchor.getAttribute('href')?.startsWith('#')) {
      click.preventDefault();
      document.getElementById('status').textContent = document.documentElement.lang === 'en' ? 'This is a mockup. Use its toolbar to change language or scenario.' : 'Это макет. Меняйте язык и сценарий в панели над ним; переходы на рабочие страницы отключены.';
    }
  });
})();
