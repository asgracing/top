import test from 'node:test';
import assert from 'node:assert/strict';
import {posix,win32} from 'node:path';
import {demoImportPath} from '../../scripts/membership-demo-paths.mjs';

test('demo compiler distinguishes filesystem entry points from site-root imports on Linux and Windows',()=>{
  for(const [paths,root] of [[posix,'/home/runner/work/top/top'],[win32,'C:\\Python\\asgracing\\top']]){
    const here=paths.join(root,'v2','membership'),entry=paths.join(root,'v2-source','membership','profile-demo-source.js');
    const options={root,here,kind:'entry-point'};
    assert.equal(demoImportPath(entry,options,paths),entry);
    assert.equal(demoImportPath('/v2/pages/profile-effects.js?v=1',{...options,kind:'import-statement'},paths),paths.join(root,'v2','pages','profile-effects.js'));
    assert.equal(demoImportPath('/src/shared/http-client.js',{...options,kind:'import-statement'},paths),paths.join(here,'demo-state.js'));
    assert.equal(demoImportPath('./locale.js',{...options,kind:'import-statement',resolveDir:here},paths),paths.join(here,'locale.js'));
  }
});
