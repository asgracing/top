import test from 'node:test';
import assert from 'node:assert/strict';
import {redirects,redirectFor,cloudflareCsv} from '../../scripts/root-redirects.mjs';
test('retired page addresses resolve directly to the final language, retaining state',()=>{
 assert.equal(redirectFor('/ru/driver/?id=drv_test&utm_source=mail#history'),'/driver/?id=drv_test&utm_source=mail#history');
 assert.equal(redirectFor('/v2/en/hourly/championship/?slug=season'),'/en/hourly/championship/?slug=season');
 assert.equal(redirectFor('/preview/ru/cars/?brand=BMW'),'/cars/?brand=BMW');
 assert.equal(redirectFor('/preview/cars/'),'/en/cars/');
 assert.equal(redirectFor('/preview/'),'/');
 assert.equal(redirectFor('/preview/asg-lab/'),'/asg-lab/');
 assert.equal(redirectFor('/events/?slug=season'),'/hourly/championship/?slug=season');
});
test('redirects cannot capture current pages, old pages, assets or APIs and have no loops',()=>{
 for(const path of ['/','/en/','/old/driver/','/v2/home.js','/v2/assets/asg-racing-wordmark.svg','/hourly/team/','/asg-lab/','/src/features/auth/header-auth.js','/hourly-votes-api/votes'])assert.equal(redirectFor(path),null);
 assert.equal(new Set(redirects.map(r=>r.source)).size,redirects.length);
 for(const r of redirects){assert.notEqual(r.source,r.target);assert.equal(redirectFor(r.target),null,'redirect chain '+r.source);assert.equal(r.preserveQuery,true);}
 for(const line of cloudflareCsv().trim().split('\n'))assert.deepEqual(line.split(',').slice(2),['301','true','false','false','false']);
});
