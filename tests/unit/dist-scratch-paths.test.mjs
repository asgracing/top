import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),module=new URL('../../scripts/dist-paths.mjs',import.meta.url).href;
const check=path=>spawnSync(process.execPath,['--input-type=module','--eval',`import '${module}'`],{env:{...process.env,ASG_DIST_OUTPUT_DIR:path},encoding:'utf8'});
test('isolated site artifacts accept dated task directories in the archive scratch root',()=>{
  for(const path of ['../_archive/tmp/2026-10-09/team-registration/review','../_archive/tmp/2026-10-12/site-release/candidate']) assert.equal(check(resolve(root,path)).status,0);
});
test('artifact output cannot select the scratch root itself, siblings or other component sources',()=>{
  for(const path of ['../_archive/tmp','../_archive/tmp-other/review','../asg-stats-server','../_archive/tmp/../../../outside','../tmp/existing-release']) assert.notEqual(check(resolve(root,path)).status,0);
});
