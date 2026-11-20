import {readFile} from 'node:fs/promises';
import {RACE_CONTROL_MAPS} from '../../assets/track-maps/race-control.js';
import {MONZA_MAP} from '../../assets/track-maps/monza.js';
import {SPA_MAP} from '../../assets/track-maps/spa.js';
import {NURBURGRING_MAP} from '../../assets/track-maps/nurburgring.js';
import {BARCELONA_MAP} from '../../assets/track-maps/barcelona.js';
import {KYALAMI_MAP} from '../../assets/track-maps/kyalami.js';
import {NURBURGRING_24H_MAP} from '../../assets/track-maps/nurburgring_24h.js';

const {tracks} = JSON.parse(await readFile(new URL('../../assets/track-maps/race-control-source.json',import.meta.url)));
const tracksByCode = {
  spa: SPA_MAP, monza: MONZA_MAP, nurburgring: NURBURGRING_MAP, barcelona: BARCELONA_MAP,
  kyalami: KYALAMI_MAP, nurburgring_24h: NURBURGRING_24H_MAP, ...RACE_CONTROL_MAPS
};
const output = Object.fromEntries(Object.entries(tracksByCode).map(([code,map])=>[code,{
  viewBox:map.viewBox, points:map.points, timing:map.timingMarks, source:map.source,
  approximate:map.approximateSectors, metres:tracks[code]?.reportedTrackMeters
}]));
console.log(JSON.stringify(output));
