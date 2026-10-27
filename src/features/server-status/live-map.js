import {trackMapGeometry} from './track-map.js?v=20261027nords1';

// Update only markers at display refresh rate. The circuit is a stable asset.
export function animateLiveMap(root,server,cars,lang='ru') {
  const svg=root.querySelector('.server-track-map svg'),map=trackMapGeometry(server);
  if (!svg || !map) return;
  const ns='http://www.w3.org/2000/svg',existing=new Map([...svg.querySelectorAll('.track-car')].map(node=>[node.dataset.carKey,node]));
  for (const c of [...cars].sort((a,b)=>(a.position===1)-(b.position===1))) {
    const key=`${c.car_id}:${c.connection_id??''}`;
    let node=existing.get(key);existing.delete(key);
    if (!node) {
      node=document.createElementNS(ns,'g');node.dataset.carKey=key;
      for (const tag of ['title','circle','text']) node.append(document.createElementNS(ns,tag));
      node.querySelector('circle').setAttribute('r',map.fixed?'14.4':'10.4');
      const text=node.querySelector('text');text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');
    }
    const point=map.project(c.world_x,c.world_z);
    if (!point.every(Number.isFinite)) continue;
    node.setAttribute('class','track-car'+(c.position===1?' is-leader':''));
    node.setAttribute('transform',`translate(${point[0].toFixed(2)} ${point[1].toFixed(2)})`);
    const position=Number.isInteger(c.position)&&c.position>0&&c.position<=256?c.position:'—';
    node.querySelector('text').textContent=String(position);
    node.querySelector('title').textContent=(lang==='ru'?'Позиция ':'Position ')+position;
    svg.append(node);
  }
  for (const node of existing.values()) node.remove();
  const caption=svg.nextElementSibling;
  if(caption?.tagName==='P'){
    const moving=svg.querySelector('.track-car');
    const message=moving
      ? (lang==='ru'?'Красный — лидер · номера обозначают позиции':'Red — leader · numbers show positions')
      : (lang==='ru'?'Нет свежих координат машин':'No fresh car positions');
    if(caption.textContent!==message)caption.textContent=message;
  }
}
