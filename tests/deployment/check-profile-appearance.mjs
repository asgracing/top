import assert from 'node:assert/strict';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const profile=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8')).driver;
const id=profile.public_id;
const saved={preset:'night',energy:115,paused:false,layers:{avatar:true,banner:true,cards:true,entry:true}};
const auth={authenticated:true,linked:true,driver:{public_id:id,display_name:profile.driver,
  profile_url:'/driver/?id='+id},steam:{persona_name:profile.driver},csrf_token:'fixture-csrf',preferences:{race_number:765}};
const json=(route,value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
const artifacts=process.env.ASG_QA_OUTPUT_DIR;
if (artifacts) await fs.mkdir(artifacts,{recursive:true});

async function open({lang='ru',route='account',tier='vip',signed=true,reduced='reduce',width=390,
  settings=saved,plain=false,editable=true,conflict=false,owns=true,paddock=false,driverData=profile}={}) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:reduced});
  const requests=[],errors=[];
  let privateReads=0,publicTier=tier;
  let current=settings, revision=3;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async request=>{
    const req=request.request();
    const url=new URL(req.url());
    if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/v2/drivers/'+id+'.json'){
      return json(request,{...driverData,race_number:765});
    }
    if(url.hostname!=='auth.asgracing.ru')return fixture(request,[],{signed});
    if(url.pathname==='/v1/me')return json(request,signed?(owns?auth:{...auth,
      driver:{...auth.driver,public_id:'drv_other'}}):{authenticated:false});
    if(url.pathname==='/v1/me/support')return json(request,{effective:null,sync:{status:'unknown'}});
    if(url.pathname==='/v1/me/profile-appearance'){
      if(req.method()==='GET'){
        privateReads++;
        return json(request,{tier,can_edit:editable,revision,effect:editable?current:null,...(paddock?{paddock_version:1,pass_editor_version:2}:{})});
      }
      const body=req.postDataJSON();
      assert.equal(req.headers()['x-csrf-token'],'fixture-csrf');
      requests.push(body);
      if(conflict && requests.length===1){
        revision++;
        current={...saved,preset:'pink'};
        return json(request,{detail:'revision_conflict'},409);
      }
      assert.equal(body.expected_revision,revision);
      current={...current,...body.effect};
      return json(request,{revision:++revision});
    }
    if(url.pathname==='/v1/drivers/'+id+'/appearance'){
      assert.ok(!req.headers().cookie,'Public appearance uses no session');
      const {target,...publicEffect}=current;
      return json(request,{tier:publicTier,effect:publicEffect,...(paddock?{paddock_version:1}:{})});
    }
    return fixture(request,[],{signed});
  });
  const prefix=base+(lang==='en'?'/en':'');
  const driverUrl=prefix+'/driver/?id='+id;
  await page.goto(route==='account'?prefix+'/account/':driverUrl+
    (plain?'&style=original':'')+(route==='edit'?'&appearance=edit':''));
  const consent=page.locator('.asg-legal-banner-btn-secondary');
  if(await consent.isVisible())await consent.click();
  const editor=page.locator('.profile-appearance-editor');
  if(route==='account'&&signed){
    const appearanceCard=page.locator('.account-appearance-card');
    await appearanceCard.getByRole('heading',{name:lang==='en'?'Profile appearance':'Оформление профиля'}).waitFor();
    await appearanceCard.getByRole('link',{name:lang==='en'?/Edit appearance/:/Настроить оформление/}).click();
    await page.waitForURL(driverUrl+'&appearance=edit');
    try{
      await editor.getByRole('heading',{name:lang==='en'?'Profile appearance':'Оформление профиля',exact:true}).waitFor({timeout:8000});
    }catch(error){
      if(artifacts) await page.screenshot({path:path.join(artifacts,'editor-error.png')});
      const diagnostic = await page.evaluate(()=>{
        const section=document.querySelector('.profile-appearance-editor');
        const center=[...document.querySelector('.center-column').children].map(child=>[child.id,child.className,getComputedStyle(child).display]);
        return {section:section?.outerHTML.slice(0,390),center};
      });
      throw new Error('Editor missing on '+page.url()+': '+JSON.stringify({privateReads,errors,diagnostic})+' / '+
        (await page.locator('#page-view').innerText()).slice(0,300),{cause:error});
    }
  }
  return {page,editor,requests,errors,prefix,privateReads:()=>privateReads,
    setPublicTier(value){publicTier=value;}};
}
try{
  for(const [tier,lang,width] of [['vip','ru',390],['pro','en',1280],['admin','ru',320]]){
    const {page,editor,requests,errors,prefix}=await open({tier,lang,width});
    await editor.locator('.project-support-badge[data-tier="'+tier+'"]').waitFor();
    await editor.locator('[data-vip-theme="night"].vip-paused').waitFor();
    assert.equal(await editor.locator('select[name="preset"] option').count(),9);
    const select=editor.locator('select[name="preset"]');
    for(const preset of ['apex','victory','telemetry','finish','heat','pink','violet']){
      await select.selectOption(preset);
      const art=editor.locator('[data-vip-theme="'+preset+'"] .vip-hero-fx');
      await art.waitFor();
      assert.equal(await art.locator('svg').count()>0,true);
    }
    await editor.locator('input[name="paused"]').check();
    await editor.getByRole('checkbox',{name:lang==='en'?'Panel outlines':'Контуры плашек'}).uncheck();
    await editor.locator('[data-save]').click();
    await editor.getByRole('status').getByText(lang==='en'?'Appearance saved.':'Оформление сохранено.').waitFor();
    assert.deepEqual(requests,[{expected_revision:3,effect:{...saved,preset:'violet',paused:true,
      layers:{...saved.layers,cards:false}}}]);
    if (artifacts) {
      await editor.scrollIntoViewIfNeeded();
      await editor.screenshot({path:path.join(artifacts,'editor-'+tier+'.png')});
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('#page-view .profile-heading .project-support-badge[data-tier="'+tier+'"]').waitFor();
    await page.locator('#page-view[data-vip-theme="violet"].vip-paused').waitFor();
    const gradientIds=await page.locator('linearGradient[id^="vip-"],radialGradient[id^="vip-"]').evaluateAll(nodes=>nodes.map(node=>node.id));
    assert.equal(gradientIds.length,new Set(gradientIds).size);
    await editor.getByRole('button',{name:lang==='en'?'Close editor':'Закрыть панель'}).click();
    await editor.waitFor({state:'detached'});
    assert.equal(new URL(page.url()).searchParams.has('appearance'),false);
    assert.equal(await page.locator('.profile-analysis').count(),1);
    assert.deepEqual(errors,[]);
    await page.close();
  }
  for(const tier of [null,'supporter']){
    const {page,editor,requests}=await open({tier,editable:false});
    await editor.locator('.profile-appearance-preview').waitFor();
    assert.equal(await editor.locator('form').count(),0);
    if(tier)await editor.locator('.project-support-badge[data-tier="supporter"]').waitFor();
    assert.deepEqual(requests,[]);
    await page.close();
  }
  for(const plain of [false,true]){
    const {page,errors,setPublicTier}=await open({route:'driver',signed:false,plain,reduced:'no-preference',width:1280});
    await page.locator('.profile-heading .project-support-badge[data-tier="vip"]').waitFor();
    if(plain){
      assert.equal(await page.locator('.vip-fx').count(),0);
    }else{
      await page.locator('[data-vip-theme="night"]').waitFor();
      assert.equal(await page.getByRole('button',{name:'Остановить движение'}).count(),0);
      await page.getByRole('tab',{name:'Обзор и SR'}).click();
      assert.equal(await page.locator('.profile-analysis').count(),1);
      if (artifacts) {
        const hero=page.locator('.profile-hero');
        await hero.screenshot({path:path.join(artifacts,'public-profile.png')});
      }
      const publicView=page.locator('#page-view');
      async function nextTier(tier){
        setPublicTier(tier);
        await page.evaluate(()=>{
          const now=Date.now;
          Date.now=()=>now()+62000;
        });
        await publicView.locator('.project-support-badge[data-tier="'+tier+'"]').waitFor({timeout:8000});
      }

      await nextTier('supporter');
      assert.equal(await publicView.locator('.vip-fx,.profile-motion-toggle').count(),0);
      await nextTier('vip');
      await page.locator('#page-view[data-vip-theme="night"] .vip-hero-fx').waitFor({timeout:8000});
    }
    assert.deepEqual(errors,[]);
    await page.close();
  }
  for(const signed of [false,true]){
    const {page,editor,privateReads}=await open({route:'edit',signed,owns:false});
    await page.locator('.profile-heading .project-support-badge').waitFor();
    assert.equal(await editor.count(),0);
    assert.equal(privateReads(),0);
    await page.close();
  }
  const {page,editor,requests}=await open({conflict:true});
  await editor.locator('[data-save]').click();
  await editor.getByRole('status').getByText('Настройки изменились в другом окне. Загружена последняя версия.').waitFor();
  assert.equal(await editor.locator('select[name="preset"]').inputValue(),'pink');
  await editor.locator('[data-save]').click();
  await editor.getByRole('status').getByText('Оформление сохранено.').waitFor();
  assert.deepEqual(requests.map(write=>write.expected_revision),[3,4]);
  await page.close();
  const publicData=process.env.ASG_PROFILE_QA_DATA
    ?JSON.parse(await fs.readFile(process.env.ASG_PROFILE_QA_DATA,'utf8')):profile;
  const admin=await open({tier:'admin',route:'edit',paddock:true,driverData:publicData,width:1600});
  await admin.editor.locator('select[name="header"]').selectOption('modern');
  await admin.editor.locator('.profile-hero[data-profile-header="modern"]').waitFor();
  await admin.editor.locator('[data-save]').click();
  await admin.page.locator('#page-view .profile-hero[data-profile-header="modern"]').waitFor();
  await admin.page.locator('#page-view > .profile-hero + .studio-key-metrics > .page-metric').first().waitFor();
  assert.equal(await admin.page.locator('.studio-key-metrics > .page-metric').count(),4);
  assert.equal(await admin.page.locator('.profile-sidebar > .studio-pass-panel + .profile-achievements').count(),1);
  await admin.page.getByRole('tab',{name:'Мой паддок'}).click();
  const padded=admin.page.locator('#profile-paddock-panel');
  await padded.locator('[data-add-pin]').click();
  await padded.locator('.race-highlight').waitFor();
  await padded.getByRole('tab',{name:'Прогресс',exact:true}).click();
  await padded.locator('#lap-target').fill('1:46.000');
  await padded.locator('[data-save-goal]').click();
  await padded.getByText('Настройки сохранены.').waitFor();
  await padded.getByRole('tab',{name:'Карточка заезда'}).click();
  await padded.locator('canvas[data-ready="true"]').waitFor();
  await padded.locator('#card-format').selectOption('square');
  const square=await padded.locator('canvas[data-ready="true"]').evaluate(canvas=>({
    pixels:[canvas.width,canvas.height],
    aspect:canvas.clientWidth/canvas.clientHeight,
    fills:canvas.clientWidth===canvas.parentElement.clientWidth,
  }));
  assert.deepEqual(square.pixels,[1080,1080]);
  assert.ok(square.fills && Math.abs(square.aspect-1)<0.01);
  const resultDownload=admin.page.waitForEvent('download');
  await padded.locator('[data-export-png]').click();
  assert.match((await resultDownload).suggestedFilename(),/\.png$/);
  await padded.getByRole('tab',{name:'Фон профиля'}).click();
  await padded.locator('[data-cover="night"]').click();
  await admin.page.locator('body[data-profile-pro-cover="night"]').waitFor();
  await padded.getByRole('tab',{name:'Карточка пилота'}).click();
  const preview=padded.locator('[data-pass-preview]');
  const controls=padded.locator('.studio-card-controls');
  assert.ok((await controls.boundingBox()).x>(await preview.boundingBox()).x);
  await admin.page.setViewportSize({width:390,height:844});
  assert.ok((await controls.boundingBox()).y>(await preview.boundingBox()).y+(await preview.boundingBox()).height);
  const colors=await padded.getByRole('radio').evaluateAll(inputs=>inputs.map(input=>getComputedStyle(input).backgroundColor));
  assert.equal(new Set(colors).size,6);
  assert.ok(colors.every(color=>color!=='rgba(0, 0, 0, 0)'));
  const passCard=preview.locator('.racing-pass');
  const passColors=()=>passCard.evaluate(card=>({
    stripe:getComputedStyle(card.querySelector('.pass-front .pass-top')).borderBottomColor,
    rearTitle:getComputedStyle(card.querySelector('.pass-back .pass-top > span')).color,
    frame:getComputedStyle(card).borderTopColor,
    rating:getComputedStyle(card.querySelector('.pass-rating b')).color,
  }));
  for(const material of ['carbon','classic','holographic']){
    await padded.locator('#pass-style').selectOption(material);
    await padded.getByRole('radio',{name:'Красный'}).check();
    const red=await passColors();
    await padded.getByRole('radio',{name:'Салатовый'}).check();
    const lime=await passColors();
    assert.equal(red.stripe,'rgb(255, 99, 73)');
    assert.equal(lime.stripe,'rgb(181, 239, 112)');
    assert.equal(lime.rearTitle,lime.stripe);
    assert.notEqual(red.frame,lime.frame);
    assert.equal(red.rating,lime.rating);
  }
  await admin.page.setViewportSize({width:1600,height:900});
  await padded.locator('#pass-style').selectOption('holographic');
  await padded.locator('#pass-motto').fill('See you on track');
  assert.equal(await padded.locator('.pass-front .pass-bottom span').innerText(),'See you on track');
  await padded.locator('[data-save-pass]').click();
  await admin.page.locator('.studio-pass-panel .racing-pass[data-card-style="holographic"]').waitFor();
  assert.equal(await admin.page.locator('.studio-pass-panel .pass-front .pass-top').evaluate(el=>getComputedStyle(el).borderBottomColor),'rgb(181, 239, 112)');
  assert.ok(admin.requests.some(write=>write.effect.pass_accent==='#b5ef70'));
  await padded.locator('[data-pass-side="back"]').click();
  assert.match(await padded.locator('[data-export-pass]').innerText(),/оборотную сторону/);
  const passDownload=admin.page.waitForEvent('download');
  await padded.locator('[data-export-pass]').click();
  assert.match((await passDownload).suggestedFilename(),/-back\.png$/);
  assert.deepEqual(admin.errors,[]);
  await admin.page.close();

  const visitor=await open({tier:'admin',route:'driver',paddock:true,signed:false,driverData:publicData,width:1280,
    settings:{...saved,header:'modern',pins:admin.requests.find(write=>write.effect.pins).effect.pins,pass_style:'holographic'}});
  await visitor.page.locator('#page-view > .profile-hero[data-profile-header="modern"]').waitFor();
  const trackImage=visitor.page.locator('.studio-hero-photo');
  const initialTrack=await trackImage.evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(initialTrack,/assets\/v2-light\/tracks\/[^"]+\.webp/);
  await visitor.page.reload();
  await trackImage.waitFor();
  await visitor.page.locator('.asg-profile-effects .vip-hero-fx').waitFor({state:'attached'});
  assert.equal(await trackImage.evaluate(el=>getComputedStyle(el).position),'absolute');
  assert.ok((await trackImage.boundingBox()).height>200);
  assert.notEqual(await trackImage.evaluate(el=>getComputedStyle(el).backgroundImage),initialTrack);
  await visitor.page.locator('.profile-sidebar > .studio-pass-panel + .profile-achievements').waitFor();
  assert.equal(await visitor.page.locator('.studio-pass-panel a.button').count(),0);
  await visitor.page.getByRole('tab',{name:'Мой паддок'}).click();
  const publicPaddock=visitor.page.locator('#profile-paddock-panel');
  await publicPaddock.getByRole('tab',{name:'Витрина'}).waitFor();
  assert.deepEqual(await publicPaddock.getByRole('tab').allTextContents(),['Витрина','Прогресс','Карточка заезда','Карточка пилота']);
  const featured=publicPaddock.locator('.race-highlight').first();
  await featured.waitFor();
  assert.match(await featured.evaluate(el=>getComputedStyle(el,'::before').backgroundSize),/cover/);
  await publicPaddock.getByRole('tab',{name:'Прогресс'}).click();
  await publicPaddock.locator('#filter-days').selectOption('365');
  assert.equal(await publicPaddock.locator('#filter-days').inputValue(),'365');
  for(const selector of ['#filter-track','#filter-car']){
    const input=publicPaddock.locator(selector);
    const options=await input.locator('option').count();
    assert.ok(options>0);
    if(options>1)await input.selectOption({index:1});
  }
  assert.equal(await publicPaddock.locator('.goal-panel, [data-report]').count(),0);
  await visitor.page.setViewportSize({width:390,height:844});
  await publicPaddock.getByRole('tab',{name:'Карточка заезда'}).click();
  await publicPaddock.locator('#card-race').selectOption({index:1});
  await publicPaddock.locator('canvas[data-ready="true"]').waitFor();
  const wide=await publicPaddock.locator('canvas').evaluate(canvas=>({
    aspect:canvas.clientWidth/canvas.clientHeight,
    fills:canvas.clientWidth===canvas.parentElement.clientWidth,
  }));
  assert.ok(wide.fills && Math.abs(wide.aspect-16/9)<0.02);
  await publicPaddock.getByRole('tab',{name:'Карточка пилота'}).click();
  assert.equal(await publicPaddock.locator('.studio-public-passes :is(.pass-front,.pass-back):visible').count(),2);
  assert.equal(await publicPaddock.locator('[data-add-pin], #lap-target, #card-format, [data-export-png], [data-save-pass], [data-pass-side], .studio-card-controls').count(),0);
  assert.equal(visitor.privateReads(),0);
  assert.deepEqual(visitor.requests,[]);
  assert.deepEqual(visitor.errors,[]);
  await visitor.page.close();

  const other=await open({tier:'pro',route:'driver',signed:true,owns:false,paddock:true,settings:{...saved,pins:[],pass_visible:false}});
  await other.page.getByRole('tab',{name:'Мой паддок'}).click();
  const otherPaddock=other.page.locator('#profile-paddock-panel');
  await otherPaddock.getByText('Пилот пока не добавил заезды в витрину.').waitFor();
  await otherPaddock.getByRole('tab',{name:'Карточка пилота'}).click();
  await otherPaddock.getByText('Карточка пилота скрыта.').waitFor();
  assert.equal(other.privateReads(),0);
  assert.deepEqual(other.requests,[]);
  await other.page.close();
  console.log('Profile appearance: VIP/PRO/ADMIN, eight presets, private save, public replay, reduced motion, mobile, read-only tiers, tier downgrade/restoration and concurrent update passed.');
}finally{
  await browser.close();
}
