import {build} from 'esbuild';
import {readFile,rm} from 'node:fs/promises';
import {resolve,posix,sep} from 'node:path';

// Only compilation changes: the runtime still uses the canonical controllers
// and the same external bridge as all existing V2 page modules.
export async function buildV2Boot({root,outputRoot,read,emit}) {
  const generated=new Set(['v2/runtime/home.js','v2/copy.js','v2/pages/control-content.js','v2/pages/information-content.js']);
  const result=await build({
    absWorkingDir:root,entryPoints:['v2/home.js'],outdir:resolve(outputRoot,'v2/boot'),
    entryNames:'[name]',chunkNames:'chunks/[name]-[hash]',bundle:true,splitting:true,
    format:'esm',platform:'browser',target:'es2022',write:false,metafile:true,
    minifyWhitespace:true,minifySyntax:false,minifyIdentifiers:false,legalComments:'none',
    plugins:[{name:'asg-v2-sources',setup(builder){
      builder.onResolve({filter:/.*/},args=>{
        const specifier=args.path.split('?')[0];
        const path=posix.normalize(specifier.startsWith('/')?specifier.slice(1):args.importer?posix.join(posix.dirname(args.importer),specifier):specifier);
        if(path.startsWith('../')||!path.endsWith('.js'))throw Error('Unexpected V2 boot import: '+args.path);
        if(path==='v2/bridge.js')return {path:'/v2/bridge.js?v=20261006v2k',external:true};
        // This module intentionally resolves its variable imports relative to
        // its original URL. Preserve that URL instead of relocating it.
        if(path==='src/runtime/page-feature-loader.js')return {path:'/src/runtime/page-feature-loader.js?v=20260910msk1',external:true};
        return {path,namespace:'asg-v2-source'};
      });
      builder.onLoad({filter:/.*/,namespace:'asg-v2-source'},async args=>({
        contents:generated.has(args.path)||args.path.startsWith('v2/pages/views/')?await readFile(resolve(outputRoot,args.path),'utf8'):await read(args.path),loader:'js'
      }));
    }}]
  });
  // Remove only obsolete compilation outputs in the isolated build directory.
  // Previously published chunks in the source checkout remain available.
  const bootRoot=resolve(outputRoot,'v2/boot');
  if(resolve(outputRoot)!==resolve(root)&&bootRoot.startsWith(resolve(outputRoot)+sep))await rm(bootRoot,{recursive:true,force:true});
  for(const file of result.outputFiles){
    const path='v2/boot/'+file.path.slice(resolve(outputRoot,'v2/boot').length+1).replaceAll('\\','/');
    await emit(path,file.text);
  }
  await emit('v2/boot/build.json',JSON.stringify({schemaVersion:1,entry:'/v2/boot/home.js',files:result.outputFiles.map(file=>({path:'/v2/boot/'+file.path.slice(resolve(outputRoot,'v2/boot').length+1).replaceAll('\\','/'),bytes:file.contents.length}))},null,2)+'\n');
}
