import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {build,transform} from 'esbuild';
const root=resolve(import.meta.dirname,'..'),here=resolve(root,'v2/membership');
const files=['v2/styles/design.css','v2/home.css','v2/pages/views/pages.css','v2/pages/views/r24-pages.css','styles/components/project-support.css','v2/pages/profile-appearance.css','v2/pages/profile-effects-art.css','v2/driver-support.css'];
let css='';
for(const file of files){
  let value=await readFile(resolve(root,file),'utf8');
  value=value.replace(/@import[^;]+;/g,'').replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(all,q,url)=>/^(?:data:|#|https?:)/.test(url)?all:`url("${new URL(url,'https://asgracing.ru/'+file).pathname}")`);
  css+='\n'+value;
}
css=css.replace(/body((?:\[[^\]]+\]|\.[\w-]+)+)/g,':host($1)').replace(/\bbody\b(?![\w.-])/g,':host');
css+='\n:host{display:block;contain:paint;isolation:isolate;color:#edf2fa;font:13px/1.45 Barlow,"Segoe UI",sans-serif;--text:#edf2fa;--muted:#a8b8cb;--line:#354658;--red:#ef2440;--panel:#111d2a;--studio-surface:#121a26;--studio-line:#344252;--studio-muted:#b3c0d0;--layer-background:-1}.native-demo-content{min-width:0}#page-view{display:block!important;padding:0!important}.profile-workspace{display:block!important}.profile-main{min-width:0}.profile-analysis{margin-top:16px;padding:18px}.profile-appearance-editor{margin-top:22px}.native-open-editor{margin-top:15px}.page-help{color:#91a7bb;font-size:12px}';
await writeFile(resolve(here,'profile-demo.css'),(await transform(css,{loader:'css',minify:true})).code);
const hero=await readFile(resolve(here,'demo-hero.html'),'utf8');
await build({entryPoints:[resolve(here,'profile-demo-source.js')],bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'none',outfile:resolve(here,'profile-demo.js'),
  define:{'import.meta.url':JSON.stringify('https://asgracing.ru/src/features/server-status/track-background.js')},
  plugins:[{name:'isolated-profile-demo',setup(b){
    b.onResolve({filter:/^native-demo-assets$/},()=>({path:'assets',namespace:'demo'}));
    b.onLoad({filter:/.*/,namespace:'demo'},()=>({contents:`export const nativeCss=await fetch('/v2/membership/profile-demo.css?v=20261126home1').then(r=>{if(!r.ok)throw Error('demo_styles');return r.text()});export const nativeHero=${JSON.stringify(hero)},trackAssets={};`,loader:'js'}));
    b.onResolve({filter:/.*/},args=>{const spec=args.path.split('?')[0];return {path:spec==='/src/shared/http-client.js'?resolve(here,'demo-state.js'):spec.startsWith('/')?resolve(root,'.'+spec):resolve(args.resolveDir||here,spec)};});
    b.onLoad({filter:/\.js$/},async args=>{
      let source=await readFile(args.path,'utf8');const path=relative(root,args.path).replaceAll('\\','/');
      if(path==='v2/pages/profile-effects.js')source=source.replace('loadStyles(),','Promise.resolve(),');
      if(path==='v2/pages/profile-studio-layout.js')source=source.replace('root.ownerDocument.body.classList.toggle','root.getRootNode().host.classList.toggle');
      if(path==='v2/pages/profile-racing-pass.js')source=source.replace(/const profileUrl=profile=>[^;]+;/,'const profileUrl=profile=>"#profile";');
      return {contents:source,loader:'js',resolveDir:dirname(args.path)};
    });
  }}]
});
