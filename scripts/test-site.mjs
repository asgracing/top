import {readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {readSiteRelease,siteRoot} from './site-release.mjs';
const config=await readSiteRelease();
// These two tests belong exclusively to the retired third interface.
// Its URL compatibility is covered by root-redirects and site-routing tests.
const retired=new Set(['preview-presentation.test.mjs','preview-routes.test.mjs']);
const files=(await readdir(resolve(siteRoot,'tests/unit'))).filter(f=>f.endsWith('.test.mjs')&&(config.layout==='parallel'||!retired.has(f))).sort();
execFileSync(process.execPath,['--test',...files.map(f=>'tests/unit/'+f)],{cwd:siteRoot,stdio:'inherit'});
