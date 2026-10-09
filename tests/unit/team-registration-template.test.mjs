import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('root release native template includes the current registration form',async()=>{
  const read=async path=>(await readFile(new URL('../../'+path,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const template=await read('v1-source/html/hourly/team/index.html'),page=await read('hourly/team/index.html');
  assert.equal(template,page,'The root build must not replace the new app shell with old native markup');
  for(const id of ['workflow-title','registration-state','entry-section','availability','registration-count']) assert.ok(template.includes(`id="${id}"`));
  assert.match(template,/app\.js\?v=20261009teams2/);
});
