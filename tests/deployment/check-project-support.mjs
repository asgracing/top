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

async function open(language,width,target,{signed=false,unavailable=false,showName=false,pending=false,funding=null,eligible}={}){
  const page=await browser.newPage({viewport:{width,height:940},reducedMotion:'reduce'});
  const errors=[];
  let listed=false,revision=0,privateReads=0,writes=0,trialTier=null;
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
          sync:{status:'current'},visibility:{listed,revision},
          ...(eligible?{trial:{used:trialTier!==null,eligible_tiers:trialTier?[]:eligible}}:{})},signed?200:401);
      }
      if(url.pathname==='/v1/me/support/trial'){
        assert.equal(request.method(),'POST');
        assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');
        assert.equal(trialTier,null);
        trialTier=request.postDataJSON().tier;
        assert.ok(eligible.includes(trialTier));
        return json(route,{tier:trialTier},201);
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
    if(target==='/'&&url.origin==='https://data.asgracing.ru'&&url.pathname==='/hourly-votes-api/voter-token'){
      return fixture(route,[],{signed});
    }
    assert.equal(request.method(),'GET',url.origin+url.pathname);
    return fixture(route,[],{signed});
  });
  await page.goto(base+(language==='en'?'/en':'')+target,{waitUntil:'networkidle'});
  const consent=page.locator('.asg-legal-banner-btn-secondary');
  if(await consent.isVisible())await consent.click();
  return {page,errors,privateReads:()=>privateReads,writes:()=>writes,trialTier:()=>trialTier};
}

try{
  for(const language of ['ru','en'])for(const width of [320,1280]){
    const home=await open(language,width,'/');
    const announcement=home.page.getByRole('link',{name:/Запуск раздела поддержки проекта!|The project support section is live!/});
    assert.equal(await announcement.getAttribute('href'),language==='en'?'/en/support/':'/support/');
    assert.equal(await home.page.getByRole('button',{name:/Monza Track Guide/}).count(),1);
    await home.page.close();

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
    const checkout=pub.page.getByRole('link',{name:/^(Оформить|Subscribe)$/});
    assert.deepEqual(await checkout.evaluateAll(links=>links.map(link=>[
      link.hostname,link.pathname,link.search,link.target,
    ])),[50024,50046,50047].map(id=>['sponsr.ru','/checkout/',`?project=asgracing&lid=${id}&type=subscribe`,'_blank']));
    assert.equal(await pub.page.getByText(/привяжите в настройках Sponsr тот же Steam|link the same Steam account/).count(),3);
    const trialButtons=pub.page.getByRole('button',{name:/Попробовать бесплатно|Try for free/});
    assert.equal(await trialButtons.count(),3);
    await trialButtons.first().click();
    const login=pub.page.getByRole('link',{name:/Войдите через Steam, чтобы попробовать|Sign in through Steam to start a trial/});
    assert.equal(new URL(await login.getAttribute('href')).searchParams.get('return_path'),language==='en'?'/en/support/':'/support/');
    assert.equal(pub.privateReads(),0);
    const gauge=pub.page.locator('[data-support-funding]');
    assert.deepEqual(await gauge.getByRole('progressbar').evaluateAll(elements=>
      elements.map(element=>[element.getAttribute('aria-valuenow'),
        element.firstElementChild.style.getPropertyValue('--funding-filled')])),
      Object.values(progress).map(value=>[String(value),value+'%']));
    assert.deepEqual(await gauge.locator('[data-funding-value]').allTextContents(),Object.values(progress).map(value=>value+'%'));
    assert.doesNotMatch(await pub.page.locator('.center-column').textContent(),/₽|RUB|\b(?:150|350|500)\b/);
    const bounds=await gauge.getByRole('progressbar').evaluateAll(elements=>
      elements.map(element=>({left:element.offsetLeft,top:element.offsetTop})));
    assert.equal(bounds[0].top,bounds[1].top);
    assert.ok(bounds[0].left<bounds[1].left);
    assert.ok(await pub.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(pub.errors,[]);
    await pub.page.close();
  }
  const trial=await open('ru',390,'/support/',{signed:true,eligible:['vip','pro']});
  await trial.page.locator('[data-support-trial="supporter"]').click();
  await trial.page.getByText('Этот уровень недоступен для пробного периода.').waitFor();
  trial.page.once('dialog',dialog=>dialog.dismiss());
  await trial.page.locator('[data-support-trial="vip"]').click();
  await trial.page.waitForFunction(()=>!document.querySelector('[data-support-trial="vip"]').disabled);
  assert.equal(trial.trialTier(),null);
  trial.page.once('dialog',dialog=>dialog.accept());
  await trial.page.locator('[data-support-trial="pro"]').click();
  await trial.page.getByText('PRO активирован на 7 дней.').waitFor();
  assert.equal(trial.trialTier(),'pro');
  assert.equal(await trial.page.locator('[data-support-trial]:disabled').count(),3);
  assert.deepEqual(trial.errors,[]);
  await trial.page.close();
  const zero=await open('ru',390,'/support/',{funding:{operating_percent:0,development_percent:0}});
  assert.deepEqual(await zero.page.locator('[data-funding-value]').allTextContents(),['0%','0%']);
  await zero.page.close();
  const missing=await open('ru',390,'/support/',{unavailable:true});
  await missing.page.getByText('Список поддержки временно недоступен').waitFor();
  await missing.page.getByText('Шкала временно недоступна').waitFor();
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
