import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nginxBundle} from '../../scripts/generate-site-nginx.mjs';
import {redirects} from '../../scripts/root-redirects.mjs';

test('nginx migration covers the current redirect registry and preserves independent origin TLS',()=>{
 const b=nginxBundle('site-redirects-20261008-r1');
 for(const r of redirects)assert.ok(b.maps.includes(` "${r.source}" "${r.target}";`));
 assert.equal(b.redirectCount,287);
 assert.ok(b.site.includes('proxy_pass https://asgracing.github.io;'));
 assert.ok(b.site.includes('proxy_ssl_verify on;'));
 assert.ok(b.site.includes('proxy_set_header Cookie "";'));
 assert.ok(b.site.includes('proxy_set_header Authorization "";'));
 assert.ok(!b.site.includes('server_name auth.')&&!b.site.includes('server_name data.'));
 assert.ok(b.acceptance.includes('listen 127.0.0.1:8842;'));
 assert.ok(b.cases.some(r=>r.path==='/races/?race_id=&race_id=later'&&r.status===204));
 assert.ok(b.cases.some(r=>r.path==='/races/?%69d=b&race_id=a'&&r.status===204));
 assert.throws(()=>nginxBundle('../../etc/nginx'));
});
