import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const env={...process.env,ASG_DIST_OUTPUT_DIR:process.env.ASG_DIST_OUTPUT_DIR||resolve(root,'../tmp/v2-step2-candidate'),ASG_SITE_LAYOUT:'root'};
for(const script of ['scripts/build-v2.mjs','scripts/build-dist.mjs','tests/deployment/verify-dist.mjs','tests/deployment/verify-references.mjs','tests/deployment/check-root-artifact.mjs'])execFileSync(process.execPath,[script],{cwd:root,env,stdio:'inherit'});
