import {execFileSync} from 'node:child_process';
import {readSiteRelease,siteRoot} from './site-release.mjs';
const config=await readSiteRelease();
const root=config.layout!=='parallel';
const env={...process.env,ASG_SITE_LAYOUT:root?'root':'parallel',ASG_ROOT_RELEASE:root?'1':'0',ASG_SITE_RELEASE_BUILD:root?'1':'0',ASG_ROOT_FALLBACK:config.layout==='root-fallback'?'1':'0',...(root?{ASG_V2_OUTPUT_DIR:process.env.ASG_V2_OUTPUT_DIR||siteRoot+'/../tmp/site-v2-compilation'}:{})};
for(const script of ['scripts/build-v2.mjs',...(!root?['scripts/check-preview.mjs']:[]),'scripts/build-dist.mjs',...(root?['tests/deployment/check-root-seo.mjs','tests/deployment/check-published-root.mjs']:[])])execFileSync(process.execPath,[script],{cwd:siteRoot,env,stdio:'inherit'});
