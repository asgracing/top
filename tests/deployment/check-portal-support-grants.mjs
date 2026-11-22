import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {base,browser,fixture,root} from './v2-browser-fixtures.mjs';

const profile=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8')).driver;
const paidUntil=new Date(Date.now()+86400000).toISOString();
const auth={authenticated:true,linked:true,driver:{public_id:profile.public_id,display_name:'Fixture Pilot',
  profile_url:'/driver/?id='+profile.public_id},steam:{persona_name:'Fixture Pilot'},csrf_token:'fixture-csrf'};
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

async function open(language,width,target,{signed=false,owner=false,operator=false,finance=false,portal=true}={}){
  const page=await browser.newPage({viewport:{width,height:940},reducedMotion:'reduce'});
  const errors=[];
  let budgetRevision=0,draft=null,published=false,suppressed=false;
  let grantRevision=0,manual=null,manualEnd=null,financeRequests=0;
  let vipCount=1;
  const memberRequests=[];
  const grantHistory=[];
  const operatorActions=[
    {tier:'supporter',expires_on:paidUntil.slice(0,10),confirm_indefinite:false,reason:'QA Supporter',expected_revision:0},
    {tier:'vip',expires_on:null,confirm_indefinite:true,reason:'QA VIP',expected_revision:1},
    {tier:'pro',expires_on:null,confirm_indefinite:true,reason:'QA PRO',expected_revision:2},
    {tier:null,expires_on:null,confirm_indefinite:false,reason:'QA revoke',expected_revision:3},
  ];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='auth.asgracing.ru'){
      if(url.pathname==='/v1/me')return json(route,signed?{
        ...auth,permissions:{portal_manage:portal,support_manage:owner,support_finance_manage:finance,support_grants_manage:operator},
      }:{authenticated:false});
      if(url.pathname==='/v1/portal-ops/support-members'){
        financeRequests++;
        memberRequests.push(Object.fromEntries(url.searchParams));
        assert.ok(owner || finance);
        const staff = url.searchParams.get('tier')==='admin';
        const matching=(!url.searchParams.get('q') || url.searchParams.get('q').toLowerCase()==='fixture') &&
          ['all',manual?'pro':'vip'].includes(url.searchParams.get('tier'));
        return json(route,{totals:{supporter:0,vip:vipCount,pro:0},monthly_equivalent:{supporter:0,vip:vipCount*35000,pro:0},
          sync:{status:'current',last_confirmed_at:paidUntil},entries:staff?[{public_id:profile.public_id,display_name:'Staff Pilot',tier:'admin'}]:matching?[{
            public_id:profile.public_id,display_name:'Fixture Pilot',tier:manual?'pro':'vip',paid_tier:'vip',
            manual_tier:manual,manual_ends_at:null,paid_until:paidUntil,
            consented:true,suppressed,revision:suppressed?1:0,
          }]:[],next_page:null});
      }
      if(url.pathname==='/v1/portal-ops/support-grants'){
        assert.ok(portal&&(owner||operator));
        return json(route,{entries:[{public_id:profile.public_id,display_name:'Fixture Pilot'}]});
      }
      if(url.pathname==='/v1/portal-ops/support-grants/'+profile.public_id){
        assert.ok(portal&&(owner||operator));
        if(request.method()==='POST'){
          assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');
          const data=request.postDataJSON();
          assert.equal(data.expected_revision,grantRevision);
          assert.deepEqual(data,operator ? operatorActions[grantRevision] : grantRevision===0 ?
            {tier:'pro',expires_on:null,confirm_indefinite:true,reason:'QA',expected_revision:0} :
            {tier:null,expires_on:null,confirm_indefinite:false,reason:'Done',expected_revision:1});
          manual=data.tier;
          manualEnd=data.expires_on ? paidUntil : null;
          grantHistory.unshift({changed_at:paidUntil,actor_public_id:profile.public_id,tier:manual,reason:data.reason});
          return json(route,{revision:++grantRevision});
        }
        return json(route,{public_id:profile.public_id,display_name:'Fixture Pilot',
          paid:{tier:operator?null:'vip',ends_at:operator?null:paidUntil},manual:{tier:manual,ends_at:manualEnd},
          effective_tier:manual||(operator?null:'vip'),revision:grantRevision,history:grantHistory});
      }
      if(url.pathname.startsWith('/v1/portal-ops/support-members/')){
        financeRequests++;
        assert.equal(owner,true);
        assert.equal(request.method(),'POST');
        assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');
        assert.deepEqual(request.postDataJSON(),{suppressed:true,expected_revision:0});
        suppressed=true;
        return json(route,{suppressed:true,revision:1});
      }
      if(url.pathname.startsWith('/v1/portal-ops/support-budget/')){
        financeRequests++;
        assert.ok(owner || finance);
        if(request.method()==='POST'){
          assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');
          const data=request.postDataJSON();
          assert.equal(data.expected_revision,budgetRevision);
          if(url.pathname.endsWith('/draft')){
            assert.equal(data.plan.confirmed,12000);
            assert.deepEqual(data.plan.items.map(item=>item.amount),[6000,3000,1000,5000]);
            draft=data.plan;
          }else{
            assert.ok(url.pathname.endsWith('/publish'));
            published=true;
          }
          return json(route,{revision:++budgetRevision});
        }
        return json(route,{revision:budgetRevision,draft,published,
          preview:draft?{operating_percent:100,development_percent:40}:null,history:[]});
      }
    }
    assert.equal(request.method(),'GET');
    return fixture(route,[],{signed});
  });
  if(finance) await page.clock.install();
  await page.goto(base+(language==='en'?'/en':'')+target,{waitUntil:'networkidle'});
  const consent=page.locator('.asg-legal-banner-btn-secondary');
  if(await consent.isVisible())await consent.click();
  return {page,errors,financeRequests:()=>financeRequests,memberRequests,setVipCount:count=>{vipCount=count;}};
}

try{
  const nonOwner=await open('ru',390,'/portal-ops/?tab=support',{signed:true});
  assert.equal(await nonOwner.page.getByRole('tab',{name:'Поддержка'}).count(),0);
  await nonOwner.page.close();
  const noPortal=await open('en',1280,'/portal-ops/?tab=support',{signed:true,operator:true,portal:false});
  assert.equal(await noPortal.page.getByRole('tab',{name:'Support',exact:true}).count(),0);
  assert.equal(noPortal.financeRequests(),0);
  await noPortal.page.close();

  for(const [language,width] of [['ru',390],['en',1280]]){
    const ru=language==='ru';
    const operator=await open(language,width,'/portal-ops/?tab=support',{signed:true,operator:true});
    const panel=operator.page.locator('#portal-panel-support');
    const manual=panel.locator('[data-support-grants]');
    await manual.waitFor();
    assert.equal(await manual.getAttribute('open'),'');
    assert.equal(await panel.locator('[data-support-finance]').isVisible(),false);
    await manual.locator('[name="q"]').fill('Fixture');
    await manual.getByRole('button',{name:ru?'Найти':'Find',exact:true}).click();
    await manual.getByRole('button',{name:/Fixture Pilot/}).click();
    for(const name of ['Supporter','VIP','PRO']){
      await manual.locator('[name="tier"]').selectOption(name.toLowerCase());
      if(name==='Supporter') await manual.locator('[name="expires_on"]').fill(paidUntil.slice(0,10));
      else await manual.locator('[name="indefinite"]').check();
      await manual.locator('[name="reason"]').fill('QA '+name);
      await manual.locator('[data-grant-form] button[type="submit"]').click();
      await operator.page.locator('[data-control-confirm]').click();
      await manual.getByText(new RegExp((ru?'Действующий уровень ':'Effective tier ')+name)).waitFor();
    }
    await manual.locator('[name="reason"]').fill('QA revoke');
    await manual.locator('[data-revoke]').click();
    await operator.page.locator('[data-control-confirm]').click();
    await manual.getByText(ru?'Ручной доступ отозван.':'Manual access revoked.',{exact:true}).waitFor();
    assert.equal(await manual.locator('[data-grant-history] li').count(),4);
    assert.equal(await manual.locator('[data-grant-history] li').first().textContent().then(value=>value.includes('QA revoke')),true);
    assert.equal(operator.financeRequests(),0);
    assert.deepEqual(operator.errors,[]);
    assert.ok(await operator.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await operator.page.evaluate(async payload=>{
      const {normalizeAuthPayload}=await import('/src/features/auth/header-auth.js?v=20261120grantpermission1');
      const bridge=await import('/v2/bridge.js?v=20261006v2k');
      let model;
      bridge.subscribe(next=>model=next)();
      bridge.publish({...model,auth:normalizeAuthPayload(payload)});
    }, {...auth,permissions:{portal_manage:true}});
    await panel.waitFor({state:'hidden'});
    assert.equal(await manual.locator('[data-grant-history] li').count(),0);
    await operator.page.close();
  }

  const finance=await open('ru',390,'/portal-ops/?tab=support',{signed:true,finance:true});
  const financePanel=finance.page.locator('#portal-panel-support');
  await financePanel.getByText(/Fixture Pilot · VIP/).waitFor();
  assert.equal(await financePanel.locator('[data-support-grants]').isVisible(),false);
  assert.equal(await financePanel.getByRole('button',{name:'Скрыть из списка'}).count(),0);
  await financePanel.getByLabel('Действующий уровень').selectOption('admin');
  await financePanel.getByText('Staff Pilot · ADMIN').waitFor();
  assert.match(await financePanel.locator('[data-member-totals]').textContent(),/350/);
  const confirmed=financePanel.getByLabel('Подтверждённые поступления, ₽');
  await confirmed.fill('123');
  await financePanel.getByLabel('Имя пилота').fill('unsent');
  finance.setVipCount(2);
  await finance.page.clock.fastForward(300_000);
  await financePanel.getByText(/VIP · 2 · 700/).waitFor();
  assert.deepEqual(finance.memberRequests.at(-1),{tier:'admin',q:'',page:'1'});
  assert.equal(await confirmed.inputValue(),'123');
  assert.equal(await financePanel.getByLabel('Имя пилота').inputValue(),'unsent');
  await finance.page.getByRole('tab',{name:'Часовые события'}).click();
  finance.setVipCount(3);
  const reads=finance.memberRequests.length;
  await finance.page.clock.fastForward(300_000);
  assert.equal(finance.memberRequests.length,reads);
  await finance.page.getByRole('tab',{name:'Поддержка'}).click();
  await financePanel.getByText(/VIP · 3 · 1[\s\u00a0]050/).waitFor();
  assert.equal(await confirmed.inputValue(),'123');
  assert.deepEqual(finance.errors,[]);
  await finance.page.close();

  const admin=await open('ru',390,'/portal-ops/?tab=support',{signed:true,owner:true});
  const panel=admin.page.locator('#portal-panel-support');
  const subscribers=panel.locator('[data-support-members]');
  await subscribers.getByText(/Fixture Pilot · VIP/).waitFor();
  assert.match(await subscribers.locator('[data-member-totals]').textContent(),/350/);
  await subscribers.getByLabel('Действующий уровень').selectOption('pro');
  await subscribers.getByText(/Пилоты не найдены/).waitFor();
  await subscribers.getByLabel('Действующий уровень').selectOption('vip');
  await subscribers.getByLabel('Имя пилота').fill('fixture');
  await subscribers.getByRole('button',{name:'Найти'}).click();
  await subscribers.getByRole('button',{name:'Скрыть из списка'}).click();
  await subscribers.getByText(/Скрыт владельцем/).waitFor();
  const grants=panel.locator('[data-support-grants]');
  await grants.getByText('Ручная выдача доступа',{exact:true}).click();
  await grants.getByLabel('Имя или ID пилота').fill('Fixture');
  await grants.getByRole('button',{name:'Найти'}).click();
  await grants.getByRole('button',{name:/Fixture Pilot/}).click();
  await grants.getByLabel('Выдать уровень').selectOption('pro');
  await grants.getByLabel('Бессрочно до отзыва').check();
  await grants.getByLabel('Причина').fill('QA');
  await grants.getByRole('button',{name:'Сохранить ручной доступ'}).click();
  await admin.page.locator('[data-control-confirm]').click();
  await grants.getByText(/Действующий уровень PRO/).waitFor();
  await subscribers.getByLabel('Действующий уровень').selectOption('pro');
  await subscribers.getByText(/Ручной доступ PRO/).waitFor();
  assert.match(await subscribers.locator('[data-member-totals]').textContent(),/350/);
  await grants.getByLabel('Причина').fill('Done');
  await grants.getByRole('button',{name:'Отозвать ручной доступ'}).click();
  await admin.page.locator('[data-control-confirm]').click();
  await grants.getByText(/Действующий уровень VIP/).waitFor();
  await panel.getByLabel('Подтверждённые поступления, ₽').fill('120');
  const amounts=panel.locator('[name="amount"]');
  for(const [index,value] of ['60','30','10','50'].entries())await amounts.nth(index).fill(value);
  await panel.getByRole('button',{name:'Сохранить черновик'}).click();
  await panel.getByRole('progressbar').first().waitFor();
  await panel.getByRole('button',{name:'Опубликовать шкалу'}).click();
  await admin.page.locator('[data-control-confirm]').click();
  await panel.getByText('У месяца есть опубликованная версия.').waitFor();
  assert.deepEqual(admin.errors,[]);
  await admin.page.close();
  console.log('Portal Ops browser fixtures passed: delegated grants, revocation, privilege boundaries, owner controls, budget and publication.');
}finally{await browser.close();}
