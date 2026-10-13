import {resolveTrackBackgroundFile} from '../features/server-status/track-background.js';
const cars=new Set([0,1,2,3,5,6,7,8,10,11,12,13,14,15,16,17,19,20,21,22,23,24,25,30,31,32,33,34,35,36]);
function attributes(kind,name,size) {
  const base=`/assets/v2-mini/${kind}/${name}`;
  return `src="${base}-96.webp" srcset="${base}-96.webp 96w, ${base}-192.webp 192w" sizes="${size}px" width="96" height="64" decoding="async" loading="lazy"`;
}
export function carThumbnailAttributes(id,size=66) {
  const model=Number(id);
  return id!=null&&cars.has(model)?attributes('car-icons',model,size):'hidden';
}
export function trackThumbnailAttributes(file,size=80) {
  const known=resolveTrackBackgroundFile(String(file||'').replace(/\.jpg$/i,''))||'spa.jpg';
  return attributes('tracks',known.replace(/\.jpg$/i,''),size);
}
