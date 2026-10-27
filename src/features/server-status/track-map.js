import {isInstanceStatusStale,serverObservationAgeMs,serverDetailMaxAgeMs} from './freshness.js?v=20261026smooth1';
import {MONZA_MAP} from '../../../assets/track-maps/monza.js?v=20261024monza1';
import {SPA_MAP} from '../../../assets/track-maps/spa.js?v=20261026spa1';
import {NURBURGRING_MAP} from '../../../assets/track-maps/nurburgring.js?v=20261026maps1';
import {BARCELONA_MAP} from '../../../assets/track-maps/barcelona.js?v=20261026maps1';
import {KYALAMI_MAP} from '../../../assets/track-maps/kyalami.js?v=20261026maps1';
import {NURBURGRING_24H_MAP} from '../../../assets/track-maps/nurburgring_24h.js?v=20261027nords1';

const fixedMaps = new Map([['monza',MONZA_MAP],['spa',SPA_MAP],['nurburgring',NURBURGRING_MAP],['barcelona',BARCELONA_MAP],['kyalami',KYALAMI_MAP],['nurburgring_24h',NURBURGRING_24H_MAP],['nordschleife',NURBURGRING_24H_MAP]]);

const coordinate = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1_000_000;

export function mapCars(server, now = Date.now()) {
  if (server?.source !== 'acc-local-telemetry' || isInstanceStatusStale(server,now) || server.status === 'offline') return [];
  const seen = new Set();
  return (server.drivers || []).slice(0,256).filter(d => {
    const age = serverObservationAgeMs(server,d.position_observed_at,now);
    if (d.connected === false || d.role === 'spectator' || !Number.isInteger(d.car_id) || seen.has(d.car_id)
      || d.coordinates_source !== 'acc-native-world-xz' || !coordinate(d.world_x) || !coordinate(d.world_z)
      || !Number.isFinite(age) || age < -1000 || age > serverDetailMaxAgeMs(server)
      || !Number.isFinite(d.position_age_ms) || d.position_age_ms < 0 || d.position_age_ms > 5000) return false;
    seen.add(d.car_id); return true;
  });
}

export function trackMapGeometry(server) {
  // Match exact track codes.
  const code = String(server?.track_code || server?.track || '').trim().toLowerCase();
  const asset = fixedMaps.get(code);
  if (asset) {
    const {worldToMap:m,worldOffset:t}=asset;
    return {...asset, fixed:true, project:(x,z)=>[
      x*m[0][0]+z*m[1][0]+t[0],x*m[0][1]+z*m[1][1]+t[1]]};
  }
  const map=server?.track_map;
  const points = map?.source === 'acc-native-complete-lap' && Array.isArray(map.points)
    && map.points.length >= 12 && map.points.length <= 512
    && map.points.every(p=>Array.isArray(p) && p.length === 2 && p.every(coordinate)) ? map.points : null;
  if (!points) return null;
  const minX = Math.min(...points.map(p=>p[0])), maxX = Math.max(...points.map(p=>p[0]));
  const minZ = Math.min(...points.map(p=>p[1])), maxZ = Math.max(...points.map(p=>p[1]));
  const scale = Math.min(416/Math.max(1,maxX-minX),256/Math.max(1,maxZ-minZ));
  const offsetX = (480-(maxX-minX)*scale)/2, offsetY = (320-(maxZ-minZ)*scale)/2;
  const project = (x,z) => [offsetX+(x-minX)*scale,offsetY+(maxZ-z)*scale];
  return {points:points.map(([x,z])=>project(x,z)),project,viewBox:[0,0,480,320],fixed:false};
}

export function renderTrackMap(server, lang = 'ru', now = Date.now(), {expanded=true} = {}) {
  if (server?.source !== 'acc-local-telemetry') return '';
  const ru = lang === 'ru', title = ru ? 'Машины на трассе' : 'Cars on track';
  const cars = mapCars(server,now), map = trackMapGeometry(server);
  const empty = ru ? 'Нет свежих координат машин' : 'No fresh car positions';
  const wrap = content => `<details class="server-track-map${map?.fixed ? ' has-fixed-map':''}"${map?.fixed ? ` data-track-map="${map.id}"`:''}${expanded ? ' open':''}><summary class="track-map-summary"><span class="track-map-title">${title}</span><span class="track-map-toggle"><span class="track-map-hide">${ru ? 'Свернуть' : 'Collapse'}</span><span class="track-map-show">${ru ? 'Развернуть' : 'Expand'}</span><span class="track-map-chevron" aria-hidden="true">⌃</span></span></summary><div class="track-map-content">${content}</div></details>`;
  if (!map || !map.fixed && !cars.length) {
    const message = !cars.length ? empty
      : (ru ? 'Собираем контур трассы — нужен полный круг' : 'Learning the circuit — one complete lap needed');
    return wrap(`<p>${message}</p>`);
  }
  const format = point=>point.map(v=>v.toFixed(2)).join(' ');
  const path = map.points.map((p,i)=>`${i ? 'L':'M'}${format(p)}`).join(' ')+' Z';
  // Leader is drawn last, keeping its red marker visible in a close group.
  const markers = [...cars].sort((a,b)=>(a.position===1)-(b.position===1)).map(d=>{
    const point=format(map.project(d.world_x,d.world_z));
    const position = Number.isInteger(d.position) && d.position > 0 && d.position <= 256 ? d.position : '—';
    const leader = d.position===1, label = `${ru ? 'Позиция':'Position'} ${position}`;
    const connection=Number.isInteger(d.connection_id)?d.connection_id:'';
    return `<g class="track-car${leader ? ' is-leader':''}" data-car-key="${d.car_id}:${connection}" transform="translate(${point})"><title>${label}</title><circle r="${map.fixed ? 14.4:10.4}"/><text text-anchor="middle" dominant-baseline="central">${position}</text></g>`;
  }).join('');
  const labels=(map.labels||[]).map(label=>`<text class="track-label${label.secondary ? ' is-secondary':''}" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${label.lines ? label.lines.map((line,i)=>`<tspan x="${label.x}" dy="${i ? '1.2em':'0'}">${line}</tspan>`).join(''):label.text}</text>`).join('');
  const credit=map.fixed ? `<p class="track-map-credit">${ru ? 'Геометрия':'Geometry'}: <a href="${map.source.url}">${map.source.credit||'Tomislav Bacinger · MIT'}</a></p>`:'';
  return wrap(`<svg viewBox="${map.viewBox.join(' ')}" role="img" aria-label="${title}"><path class="track-outline" d="${path}"/>${labels}${markers}</svg><p>${cars.length ? (ru ? 'Красный — лидер · номера обозначают позиции' : 'Red — leader · numbers show positions'):empty}</p>${credit}`);
}
