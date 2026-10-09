import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {readSiteRelease,siteRoot} from './site-release.mjs';
const config=await readSiteRelease();
const env={...process.env,...(config.layout==='parallel'?{}:{ASG_V2_OUTPUT_DIR:process.env.ASG_V2_OUTPUT_DIR||resolve(siteRoot,'../tmp/site-v2-compilation')})};
for(const script of ['scripts/build-v2.mjs','v2/runtime/home.js','v2/home.js','v2/bridge.js','v2/presentation.js','v2/header.js','v2/guide.js','v2/models.js','v2/routes.js','v2/page-registry.js','src/features/home-version-switch.js','tests/site-quality/check-v2-home.mjs','tests/deployment/check-v2-build.mjs']){
 const args=script.startsWith('v2/')||script.startsWith('src/')?['--check',script]:[script];
 execFileSync(process.execPath,args,{cwd:siteRoot,env,stdio:'inherit'});
}
