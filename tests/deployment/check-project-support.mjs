import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {base,browser,fixture,root} from './v2-browser-fixtures.mjs';

const profile=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8')).driver;
const paidUntil=new Date(Date.now()+86400000).toISOString();
const auth={authenticated:true,linked:true,driver:{public_id:profile.public_id,display_name:'Fixture Pilot',
  profile_url:'/driver/?id='+profile.public_id},steam:{persona_name:'Fixture Pilot'},csrf_token:'fixture-csrf'};
const entry={public_id:profile.public_id,display_name:'<Fixture Pilot>',tier:'supporter',
  avatar_url:'https://avatars.cloudflare.steamstatic.com/test.jpg'};
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

async function open(language,width,target,{signed=false,unavailable=false,showName=false,pending=false,funding=null}={}){
  const page=await browser.newPage({viewport:{width,height:940},reducedMotion:'reduce'});
  const errors=[];
  let listed=false,revision=0,privateReads=0,writes=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='auth.asgracing.ru'){
      if(url.pathname==='/v1/me')return json(route,signed?{
        ...auth,
      }:{authenticated:false});
      if(url.pathname==='/v1/support/funding')return json(route,{progress:funding},unavailable?503:200);
      if(url.pathname==='/v1/me/support'){
        privateReads++;
        return json(route,{paid:{tier:'supporter',paid_until:paidUntil},
          sync:{status:'current'},visibility:{listed,revision}},signed?200:401);
      }
      if(url.pathname==='/v1/me/support/preferences'){
        assert.equal(request.method(),'POST');
        assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');
        const data=request.postDataJSON();
        assert.deepEqual(data,{listed:!listed,expected_revision:revision});
        writes++;listed=data.listed;revision++;
        return json(route,{listed,revision});
      }
      if(url.pathname==='/v1/support'&&pending)return json(route,{status:'pending',totals:null,entries:[],next_page:null});
      if(url.pathname==='/v1/support')return json(route,{totals:{supporter:2,vip:0,pro:0},
        entries:showName?[entry]:[],next_page:null},unavailable?503:200);
    }
    if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/v2/drivers/'+profile.public_id+'.json'){
      return json(route,profile);
    }
    assert.equal(request.method(),'GET');
    return fixture(route,[],{signed});
  });
  await page.goto(base+(language==='en'?'/en':'')+target,{waitUntil:'networkidle'});
  const consent=page.locator('.asg-legal-banner-btn-secondary');
  if(await consent.isVisible())await consent.click();
  return {page,errors,privateReads:()=>privateReads,writes:()=>writes};
}

try{
  for(const language of ['ru','en'])for(const width of [320,1280]){
    const {page,errors,writes}=await open(language,width,'/account/',{signed:true});
    const card=page.locator('.control-summary .project-support-account');
    await card.locator('time').waitFor();
    assert.equal(await card.locator('time').getAttribute('datetime'),paidUntil);
    const consent=card.getByRole('checkbox');
    assert.equal(await consent.isChecked(),false);
    await consent.check();
    await card.getByText(language==='en'?'Saved':'Сохранено').waitFor();
    await consent.uncheck();
    await card.getByText(language==='en'?'Saved':'Сохранено').waitFor();
    assert.equal(writes(),2);
    assert.equal(await card.getByRole('link',{name:/Открыть раздел поддержки|Open support/}).getAttribute('href'),language==='en'?'/en/support/':'/support/');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    await page.close();

    const progress=width===320 ? {operating_percent:75,development_percent:0} :
      {operating_percent:100,development_percent:40};
    const pub=await open(language,width,'/support/',{showName:true,funding:progress});
    await pub.page.locator('.project-support-list li').waitFor();
    assert.match(await pub.page.locator('[data-support-list-status]').textContent(),/Supporter 2/);
    assert.equal(await pub.page.locator('.project-support-list li').count(),1);
    assert.equal(await pub.page.locator('[data-support-group="supporter"] li').count(),1);
    assert.match(await pub.page.locator('.project-support-list a').textContent(),/<Fixture Pilot>/);
    assert.equal(pub.privateReads(),0);
    assert.equal(await pub.page.locator('#page-view a[href*="sponsr.ru"]').count(),0);
    const gauge=pub.page.locator('[data-support-funding]');
    assert.deepEqual(await gauge.getByRole('progressbar').evaluateAll(elements=>
      elements.map(element=>[element.getAttribute('aria-valuenow'),
        element.firstElementChild.style.getPropertyValue('--funding-filled')])),
      Object.values(progress).map(value=>[String(value),value+'%']));
    assert.doesNotMatch(await pub.page.locator('.center-column').textContent(),/₽|RUB|\b(?:150|350|500)\b/);
    const bounds=await gauge.getByRole('progressbar').evaluateAll(elements=>
      elements.map(element=>({left:element.offsetLeft,top:element.offsetTop})));
    assert.equal(bounds[0].top,bounds[1].top);
    assert.ok(bounds[0].left<bounds[1].left);
    assert.ok(await pub.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(pub.errors,[]);
    await pub.page.close();
  }
  const missing=await open('ru',390,'/support/',{unavailable:true});
  await missing.page.getByText('Список поддержки временно недоступен').waitFor();
  assert.equal(await missing.page.locator('.project-support-list li').count(),0);
  assert.deepEqual(missing.errors,[]);
  await missing.page.close();
  const guest=await open('ru',390,'/account/');
  assert.equal(await guest.page.locator('.project-support-account').count(),0);
  assert.equal(guest.privateReads(),0);
  assert.deepEqual(guest.errors,[]);
  await guest.page.close();
  const missingReport=await open('ru',320,'/support/',{pending:true});
  await missingReport.page.getByText('Первая сверка подписок ещё не завершена.').waitFor();
  assert.equal(await missingReport.page.locator('[data-support-group]:visible').count(),0);
  await missingReport.page.getByText('Отчёт за текущий месяц пока не опубликован').waitFor();
  assert.equal(await missingReport.page.getByRole('progressbar').count(),0);
  await missingReport.page.close();
  console.log('Public support and account consent: RU/EN desktop and mobile, available and unavailable public data, hidden supporters, horizontal progress, no public financial amounts, and no private subscription requests from the public page.');
}finally{await browser.close();}
