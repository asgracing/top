import test from 'node:test';
import assert from 'node:assert/strict';
import {disabledLegacyPage} from '../../scripts/legacy-site.mjs';
import {versionHref} from '../../v2/site-routing.js';
const current=(path,language)=>versionHref('v2',new URL(path,'https://asgracing.ru'),language,{layout:'root',version:'old'});
test('disabled legacy entry preserves language, entity, unrelated query and fragment',()=>{
 assert.equal(current('/old/en/races/?race_id=race-1&tab=qualifying#result','en'),'/en/race/?tab=qualifying&id=race-1#result');
 assert.equal(current('/old/news/?slug=hello','ru'),'/news/article/?id=hello');
 assert.equal(current('/old/hourly/privacy/','ru'),'/privacy/');
 assert.equal(current('/old/en/hourly/cookies/','en'),'/en/cookies/');
});
test('legacy gate serves a current-interface fallback and loads no legacy app',()=>{
 const html=disabledLegacyPage('/old/en/driver/','en');
 assert.match(html,/data-legacy-disabled="true"/);
 assert.match(html,/href="\/en\/driver\/"/);
 assert.match(html,/<noscript><meta http-equiv="refresh"/);
 assert.doesNotMatch(html,/src="[^\"]*(?:app\.js|legal\.js)/);
});
