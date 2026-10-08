import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {redirects} from './root-redirects.mjs';
import {entityRules,edgeDecision} from './edge-release-plan.mjs';

export function nginxBundle(version){
 if(!/^site-redirects-[0-9]{8}-r[0-9]+$/.test(version))throw Error('Invalid release identifier');
 const remote=`/opt/asg-site/releases/${version}`;
 const ngv=name=>'$'+'{'+name+'}';
 const lines=[`# Generated from root-redirects.mjs and edge-release-plan.mjs; ${version}`,
 'map $request_uri $asg_raw_path { default ""; ~^(?<asg_path_capture>[^?]*) $asg_path_capture; }',
 'map $args $asg_has_id { default 0; ~(?:^|&)(?:i|%69)(?:d|%64)(?:=|&|$) 1; }'];
 for(const [entity,key]of [['race','race_id'],['news','slug']]){
  const paths=new Map(entityRules().filter(r=>r.test_contract.key===key).flatMap(r=>r.test_contract.paths.map(p=>[p,r.test_contract.target])));
  lines.push(`map $asg_raw_path $asg_${entity}_target {`, ' default "";',...Array.from(paths,([p,t])=>` "${p}" "${t}";`),'}',
   `map $args $asg_${entity}_query {`, ' default "";',
   ` "~^(?<asg_${entity}_before>(?:[^&]*&)*?)${key}=(?<asg_${entity}_value>[^&]*)(?<asg_${entity}_after>&.*)?$" "${ngv('asg_'+entity+'_before')}id=${ngv('asg_'+entity+'_value')}${ngv('asg_'+entity+'_after')}";`, '}',
   `map $asg_${entity}_query $asg_${entity}_nonempty { default 0; ~^(?:[^&]*&)*?id=[^&]+ 1; }`,
   `map "$asg_has_id:$asg_${entity}_nonempty:$asg_${entity}_target" $asg_${entity}_redirect {`, ' default "";',
   ` "~^0:1:(?<asg_${entity}_detail>/.+)$" "$asg_${entity}_detail?$asg_${entity}_query";`, '}');
 }
 lines.push('map $asg_raw_path $asg_page_target {',' default "";',...redirects.map(r=>` "${r.source}" "${r.target}";`),'}',
  'map $asg_page_target $asg_page_redirect { default "$asg_page_target$is_args$args"; "" ""; }',
  'map $asg_race_redirect $asg_entity_redirect { default $asg_race_redirect; "" $asg_news_redirect; }',
  'map $asg_entity_redirect $asg_final_redirect { default $asg_entity_redirect; "" $asg_page_redirect; }',
  'map $request_method $asg_redirect { default ""; GET $asg_final_redirect; HEAD $asg_final_redirect; }',
  'map $asg_redirect $asg_canonical_uri { default $asg_redirect; "" $request_uri; }');
 const maps=lines.join('\n')+'\n';
 const redirect='if ($asg_redirect != "") { return 301 https://asgracing.ru$asg_redirect; }';
 const site=`# ${version}: root/www only, existing API/data/auth vhosts remain separate.
server {
 listen 80;
 listen [::]:80;
 server_name asgracing.ru www.asgracing.ru;
 access_log off;
 location ^~ /.well-known/acme-challenge/ { root /var/www/asg-site-acme; }
 location / { return 301 https://asgracing.ru$asg_canonical_uri; }
}
server {
 listen 443 ssl http2;
 listen [::]:443 ssl http2;
 server_name www.asgracing.ru;
 ssl_certificate /etc/letsencrypt/live/asgracing.ru/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/asgracing.ru/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
 access_log off;
 return 301 https://asgracing.ru$asg_canonical_uri;
}
server {
 listen 443 ssl http2;
 listen [::]:443 ssl http2;
 server_name asgracing.ru;
 ssl_certificate /etc/letsencrypt/live/asgracing.ru/fullchain.pem;
 ssl_certificate_key /etc/letsencrypt/live/asgracing.ru/privkey.pem;
 ssl_protocols TLSv1.2 TLSv1.3;
 access_log off;
 ${redirect}
 location / {
  # Origin name resolves independently of the website DNS and certificate.
  proxy_pass https://asgracing.github.io;
  proxy_set_header Host asgracing.ru;
  proxy_set_header Cookie "";
  proxy_set_header Authorization "";
  proxy_set_header Connection "";
  proxy_http_version 1.1;
  proxy_ssl_server_name on;
  proxy_ssl_name asgracing.github.io;
  proxy_ssl_verify on;
  proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
  proxy_ssl_verify_depth 4;
  proxy_connect_timeout 5s;
  proxy_read_timeout 30s;
  # No new cache: subsequent GitHub publications retain existing freshness.
 }
}
`;
 const acceptance=`pid ${remote}/acceptance.pid;
error_log ${remote}/acceptance-error.log;
events { worker_connections 128; }
http {
 include ${remote}/maps.conf;
 access_log off;
 server { listen 127.0.0.1:8842; server_name asgracing.ru; ${redirect} location / { return 204; } }
 server { listen 127.0.0.1:8842; server_name www.asgracing.ru; return 301 https://asgracing.ru$asg_canonical_uri; }
}
`;
 const cases=[];
 function add(path,method='GET',host='asgracing.ru'){
  const url='https://'+host+path;
  const answer=edgeDecision(url,{method});
  cases.push({path,method,host,status:answer?301:host.startsWith('www.')?301:204,location:answer?.location||(host.startsWith('www.')?'https://asgracing.ru'+path:null)});
 }
 for(const r of redirects){add(r.source);add(r.source+'?utm_source=asg&utm_campaign=x%26y');}
 for(const [path,key]of [['/races/','race_id'],['/ru/races/','race_id'],['/preview/ru/races/','race_id'],['/v2/en/races','race_id'],['/news/','slug'],['/preview/ru/news/','slug'],['/en/news/','slug']]){
  for(const args of [`${key}=a%2Fb&utm_source=one&utm_source=two`,`utm_campaign=a%26b&${key}=a+b`,`x=1&${key}=first&${key}=second`,`${key}=&${key}=later`,`${key}=a&id=b`,`%69d=b&${key}=a`,`i%64=b&${key}=a`,`${key.toUpperCase()}=a`,`other=${key}=a`])add(path+'?'+args);
 }
 for(const path of ['/','/en/','/old/','/old/news/?slug=a','/v2/runtime/home.js','/hourly-votes-api/vote','/asg-lab/','/hourly/team/','/unknown/'])add(path);
 for(const method of ['HEAD','POST','PUT','DELETE'])for(const path of ['/ru/','/races/?race_id=a','/news/?slug=a'])add(path,method);
 for(const path of ['/ru/?utm_source=asg','/v2/en/races/?race_id=a%2Fb&x=1','/unknown/?x=1'])add(path,'GET','www.asgracing.ru');
 return {version,remote,maps,site,acceptance,cases,redirectCount:redirects.length};
}

async function main(){
 const [version,directory]=process.argv.slice(2);
 if(!version||!directory)throw Error('Usage: node scripts/generate-site-nginx.mjs VERSION OUTPUT');
 const b=nginxBundle(version);await mkdir(directory,{recursive:true});
 for(const [name,data]of [['maps.conf',b.maps],['site.conf',b.site],['acceptance.conf',b.acceptance],['cases.json',JSON.stringify(b.cases,null,2)+'\n']])await writeFile(resolve(directory,name),data);
 console.log(JSON.stringify({version,redirects:b.redirectCount,cases:b.cases.length,directory:resolve(directory)}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await main();
