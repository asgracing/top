import {redirects} from './root-redirects.mjs';
const hosts=['asgracing.ru','www.asgracing.ru'];
const listName='asg_v2_root_20261007';
export function entityRules(status=301){
 if(![301,302].includes(status))throw Error('Only acceptance 302 or permanent 301 is supported');
 const rules=[];
 for(const [entity,key,listPath,detailPath]of [['race','race_id','races/','race/'],['news','slug','news/','news/article/']])for(const lang of ['ru','en']){
  const prefix=lang==='en'?'/en/':'/',archive=prefix+listPath;
  const paths=new Set([archive,archive.slice(0,-1),...redirects.filter(r=>r.target===archive).map(r=>r.source)]);
  for(const position of ['first','middle']){
   const expression=`(http.host in {"asgracing.ru" "www.asgracing.ru"} and http.request.method in {"GET" "HEAD"} and http.request.uri.path in {${[...paths].sort().map(p=>JSON.stringify(p)).join(' ')}} and http.request.uri.args["${key}"][0] ne "" and not any(url_decode(http.request.uri.args.names[*])[*] eq "id") and ${position==='first'?`starts_with(http.request.uri.query, "${key}=")`:`not starts_with(http.request.uri.query, "${key}=") and http.request.uri.query contains "&${key}="`})`;
   const pattern=position==='first'?`*?${key}=*`:`*?*&${key}=*`;
   const replacement=`https://asgracing.ru${prefix+detailPath}?${position==='first'?'id=${2}':'${2}&id=${3}'}`;
   rules.push({ref:`asg_v2_${entity}_${lang}_${position}`,description:`ASG V2 ${entity} ${lang}: ${key} to id (${position})`,action:'redirect',expression,enabled:false,action_parameters:{from_value:{target_url:{expression:`wildcard_replace(http.request.full_uri, ${JSON.stringify(pattern)}, ${JSON.stringify(replacement)}, "s")`},status_code:status,preserve_query_string:false}},test_contract:{paths:[...paths],key,position,target:prefix+detailPath}});
  }
 }
 return rules;
}
export function bulkRows(status=301){
 if(![301,302].includes(status))throw Error('Invalid redirect status');
 return redirects.flatMap(row=>hosts.map(host=>({source:host+row.source,target:'https://asgracing.ru'+row.target,status,preserve_query_string:true,include_subdomains:false,subpath_matching:false,preserve_path_suffix:false})));
}
export function bulkCsv(status=301){return bulkRows(status).map(r=>`${r.source},${r.target},${r.status},true,false,false,false`).join('\n')+'\n';}
export function edgePlan(status=301){
 const single=entityRules(status).map(({test_contract,...rule})=>rule);
 return {schemaVersion:1,status:'prepared-not-applied',hosts,listName,activationRequires:['current-zone-export','DNS-and-SSL-check','available-rule-quota','Cloudflare-expression-validation','published-targets-verified','candidate-approval'],single:{phase:'http_request_dynamic_redirect',kind:'zone',rules:single},bulk:{phase:'http_request_redirect',kind:'root',rules:[{ref:'asg_v2_root_bulk',description:'ASG V2 exact page migrations',action:'redirect',expression:`(http.host in {"asgracing.ru" "www.asgracing.ru"} and http.request.method in {"GET" "HEAD"} and http.request.full_uri in $${listName})`,enabled:false,action_parameters:{from_list:{name:listName,key:'http.request.full_uri'}}}]},counts:{single:single.length,lists:1,bulk:1,urls:bulkRows(status).length},queryExceptions:['existing id: client compatibility resolves precedence','encoded legacy parameter name: client compatibility','duplicate legacy keys: first value retained; later keys unchanged'],applyStrategy:'Append ASG-owned disabled rules/list to exported existing configuration. Never replace the whole entrypoint ruleset.'};
}
// Local semantic model, not a Cloudflare expression compiler.
export function edgeDecision(value,{method='GET',status=301}={}){
 const url=new URL(value,'https://asgracing.ru');
 if(!hosts.includes(url.hostname)||!['http:','https:'].includes(url.protocol)||!['GET','HEAD'].includes(method))return null;
 const raw=url.search.slice(1),pairs=raw.split('&');
 for(const rule of entityRules(status)){
  const c=rule.test_contract;
  if(!c.paths.includes(url.pathname)||url.searchParams.has('id'))continue;
  const i=pairs.findIndex(p=>p.startsWith(c.key+'='));
  if(i<0||!pairs[i].slice(c.key.length+1)||(c.position==='first')!==(i===0))continue;
  const query=pairs.map((p,n)=>n===i?'id='+p.slice(c.key.length+1):p).join('&');
  return {status,location:'https://asgracing.ru'+c.target+'?'+query+url.hash,kind:'single',rule:rule.ref};
 }
 const match=redirects.find(r=>r.source===url.pathname);
 return match?{status,location:'https://asgracing.ru'+match.target+url.search+url.hash,kind:'bulk'}:null;
}
