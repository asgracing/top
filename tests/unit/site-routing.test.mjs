import test from 'node:test';
import assert from 'node:assert/strict';
import {screenPath,routeHref,languageHref,versionHref,scopeSiteHref,siteContext,canonicalEntityHref} from '../../v2/site-routing.js';
const current=path=>({href:'https://asgracing.ru'+path,pathname:path.split(/[?#]/)[0],origin:'https://asgracing.ru'});
const root={layout:'root',version:'v2'},old={layout:'root',version:'old'};
test('release addresses keep root Russian and English explicit',()=>{
  assert.equal(routeHref('hourly/','ru',root),'/hourly/');
  assert.equal(routeHref('driver/','en',root),'/en/driver/');
  assert.equal(routeHref('driver/','en',old),'/old/en/driver/');
  assert.equal(routeHref('driver/','ru',{layout:'parallel'}),'/v2/ru/driver/');
  for(const path of ['/old','/old/en/','/v2/ru','/en/index.html'])assert.equal(screenPath(path),'');
  assert.equal(screenPath('/old/en/hourly/index.html'),'hourly/');
});
test('language and version switches preserve entities, filters and anchors',()=>{
  const page=current('/driver/?id=drv_test&lang=en&utm_source=asg#history');
  assert.equal(languageHref('en',page,root),'/en/driver/?id=drv_test&utm_source=asg#history');
  assert.equal(versionHref('old',page,'ru',root),'/old/driver/?id=drv_test&utm_source=asg#history');
  assert.equal(versionHref('v2',current('/old/en/driver/?id=x#races'),'en',old),'/en/driver/?id=x#races');
  assert.equal(versionHref('old',current('/en/race/?id=r1'),'en',root),'/old/en/races/?race_id=r1');
  assert.equal(versionHref('v2',current('/old/races/?race_id=r1'),'ru',old),'/race/?id=r1');
  assert.equal(versionHref('old',current('/documents/read/?id=cookies'),'ru',root),'/old/cookies/?id=cookies');
});
test('scoping affects navigation only and preserves excluded workflows',()=>{
  const page=current('/old/en/hourly/');
  assert.equal(scopeSiteHref('/ru/driver/?id=x&lang=ru#stats','en',page,old),'/old/en/driver/?id=x#stats');
  assert.equal(scopeSiteHref('/v2/ru/hourly/','en',current('/en/'),root),'/en/hourly/');
  assert.equal(scopeSiteHref('/ru/hourly/team/?season=s','ru',page,old),'/hourly/team/?season=s&lang=ru');
  assert.equal(scopeSiteHref('/account/asg-lab/','en',page,old),'/account/asg-lab/?lang=en');
  for(const href of ['https://data.asgracing.ru/top-data/v2/manifest.json','https://auth.asgracing.ru/v1/auth/steam/start','/src/features/auth/header-auth.js','/ads/desktop.jpg','#rules','https://dudarevmotorsport.ru?utm_source=partner'])assert.equal(scopeSiteHref(href,'ru',page,old),href);
});
test('only an explicit root layout or old URL changes the existing address scheme',()=>{
  assert.equal(siteContext(current('/en/')).layout,'parallel');
  assert.deepEqual(siteContext(current('/old/en/')),old);
  assert.deepEqual(siteContext(current('/'),{documentElement:{dataset:{siteLayout:'root'}}}),root);
});
test('legacy result and article links keep their entity after switching the primary site',()=>{
 assert.equal(canonicalEntityHref(current('/news/?slug=update&utm_source=mail#read'),'ru',root),'/news/article/?utm_source=mail&id=update#read');
 assert.equal(canonicalEntityHref(current('/en/races/?race_id=r1'),'en',root),'/en/race/?id=r1');
 assert.equal(canonicalEntityHref(current('/old/races/?race_id=r1'),'ru',old),null);
 assert.equal(canonicalEntityHref(current('/news/?page=2'),'ru',root),null);
});
