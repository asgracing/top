import {execFileSync} from 'node:child_process';
import {readSiteRelease,siteRoot} from './site-release.mjs';
const config=await readSiteRelease();
const scripts=config.layout==='parallel'?['scripts/generate-localized-pages.mjs','tests/site-quality/check-localized-seo.mjs']:[];
for(const script of scripts)execFileSync(process.execPath,[script,...(script.includes('generate-')?['--check']:[])],{cwd:siteRoot,stdio:'inherit'});
if(config.layout!=='parallel')console.log('Root SEO and published-output equality are checked by the release build; legacy HTML generation is disabled.');
