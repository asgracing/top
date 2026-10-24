import {isInstanceStatusStale,parseServerStatusUpdatedAt,serverDetailMaxAgeMs} from './freshness.js?v=20261023cadence1';
import {MONZA_MAP} from '../../../assets/track-maps/monza.js?v=20261024monza1';

const coordinate = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1_000_000;

export function mapCars(server, now = Date.now()) {
  if (server?.source !== 'acc-local-telemetry' || isInstanceStatusStale(server,now) || server.status === 'offline') return [];
  const seen = new Set();
  return (server.drivers || []).slice(0,256).filter(d => {
    const age = now - parseServerStatusUpdatedAt(d.position_observed_at);
    if (d.connected === false || d.role === 'spectator' || !Number.isInteger(d.car_id) || seen.has(d.car_id)
      || d.coordinates_source !== 'acc-native-world-xz' || !coordinate(d.world_x) || !coordinate(d.world_z)
      || !Number.isFinite(age) || age < -1000 || age > serverDetailMaxAgeMs(server)
      || !Number.isFinite(d.position_age_ms) || d.position_age_ms < 0 || d.position_age_ms > 5000) return false;
    seen.add(d.car_id); return true;
  });
}

export function trackMapGeometry(server) {
  // A layout is selected by track identity, never by server name or its learned lap.
  const code = String(server?.track_code || server?.track || '').trim().toLowerCase();
  if (code === 'monza') {
    const {worldToMap:m,worldOffset:t}=MONZA_MAP;
    return {...MONZA_MAP, fixed:true, project:(x,z)=>[
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

export function renderTrackMap(server, lang = 'ru', now = Date.now()) {
  if (server?.source !== 'acc-local-telemetry') return '';
  const ru = lang === 'ru', title = ru ? 'Машины на трассе' : 'Cars on track';
  const cars = mapCars(server,now), map = trackMapGeometry(server);
  const empty = ru ? 'Нет свежих координат машин' : 'No fresh car positions';
  if (!map || !map.fixed && !cars.length) {
    const message = !cars.length ? empty
      : (ru ? 'Собираем контур трассы — нужен полный круг' : 'Learning the circuit — one complete lap needed');
    return `<section class="server-track-map"><h3>${title}</h3><p>${message}</p></section>`;
  }
  const format = point=>point.map(v=>v.toFixed(2)).join(' ');
  const path = map.points.map((p,i)=>`${i ? 'L':'M'}${format(p)}`).join(' ')+' Z';
  // Leader is drawn last, keeping its red marker visible in a close group.
  const markers = [...cars].sort((a,b)=>(a.position===1)-(b.position===1)).map(d=>{
    const point=format(map.project(d.world_x,d.world_z));
    const position = Number.isInteger(d.position) && d.position > 0 && d.position <= 256 ? d.position : '—';
    const leader = d.position===1, label = `${ru ? 'Позиция':'Position'} ${position}`;
    return `<g class="track-car${leader ? ' is-leader':''}" transform="translate(${point})"><title>${label}</title><circle r="${map.fixed ? 18:13}"/><text text-anchor="middle" dominant-baseline="central">${position}</text></g>`;
  }).join('');
  const labels=(map.labels||[]).map(label=>`<text class="track-label${label.secondary ? ' is-secondary':''}" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${label.lines ? label.lines.map((line,i)=>`<tspan x="${label.x}" dy="${i ? '1.2em':'0'}">${line}</tspan>`).join(''):label.text}</text>`).join('');
  const credit=map.fixed ? `<p class="track-map-credit">${ru ? 'Геометрия':'Geometry'}: <a href="https://github.com/bacinger/f1-circuits">Tomislav Bacinger · MIT</a></p>`:'';
  return `<section class="server-track-map${map.fixed ? ' has-fixed-map':''}"${map.fixed ? ` data-track-map="${map.id}"`:''}><h3>${title}</h3><svg viewBox="${map.viewBox.join(' ')}" role="img" aria-label="${title}"><path class="track-outline" d="${path}"/>${labels}${markers}</svg><p>${cars.length ? (ru ? 'Красный — лидер · номера обозначают позиции' : 'Red — leader · numbers show positions'):empty}</p>${credit}</section>`;
}
