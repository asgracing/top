import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {carThumbnailAttributes,trackThumbnailAttributes} from '../../src/shared/image-thumbnails.js';
test('every original model and mapped track has both small WebP variants',async()=>{
 const root=new URL('../../',import.meta.url),cars=(await readdir(new URL('assets/car-icons',root))).filter(f=>f.endsWith('.png'));
 const tracks=[...new Set((await readFile(new URL('src/features/server-status/track-background.js',root),'utf8')).match(/\w+\.jpg/g))];
 for(const [kind,names,resolver] of [['car-icons',cars,carThumbnailAttributes],['tracks',tracks,trackThumbnailAttributes]])for(const name of names){
  const stem=name.replace(/\.(png|jpg)$/,''),attrs=resolver(kind==='car-icons'?Number(stem):name);
  assert.ok(attrs.includes('srcset=')&&attrs.includes('decoding="async"'));
  for(const width of [96,192]){const file=await readFile(new URL(`assets/v2-mini/${kind}/${stem}-${width}.webp`,root));assert.equal(file.toString('ascii',8,12),'WEBP');assert.ok(file.length<30000);}
 }
 assert.equal(carThumbnailAttributes(999),'hidden');assert.ok(trackThumbnailAttributes('unknown').includes('/spa-96.webp'));
});
