import * as nodePath from 'node:path';

export function demoImportPath(specifier,{kind,root,here,resolveDir},paths=nodePath){
  const spec=specifier.split('?')[0];
  if(kind==='entry-point')return paths.resolve(spec);
  if(spec==='/src/shared/http-client.js')return paths.resolve(here,'demo-state.js');
  return spec.startsWith('/')?paths.resolve(root,'.'+spec):paths.resolve(resolveDir||here,spec);
}
