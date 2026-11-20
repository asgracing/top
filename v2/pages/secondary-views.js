import {createArchiveViews} from './views/archive.js?v=20261015pagination1';
import {createChampionshipViews} from './views/championships.js?v=20261015pagination1';
import {createEntityViews} from './views/entities.js?v=20261015pagination1';
import {createCarsViews} from './views/cars.js?v=20261015pagination1';
import {createFunViews} from './views/fun.js?v=20261007v2pages14';
import {createBansViews} from './views/bans.js?v=20261105moderation1';
import {createEditorialViews} from './views/editorial.js?v=20261015pagination1';
import {createHistoryViews} from './views/history.js?v=20261007v2pages14';
import {formatMoscowDateTime} from '/src/shared/time.js';

export function createSecondaryViews({modalApi,raw,state,route,views,language,viewer}) {
  const eloCategory = p => p.elo_category_id ?? (p.elo>=1350?1:p.elo>=1250?2:p.elo>=1150?3:p.elo>=1050?4:p.elo>=950?5:6);
  const raceViews = {...modalApi,raw,state,route,eloCategory,viewer};
  const statsApi = {...modalApi,raw,state,route,time:value=>formatMoscowDateTime(value,language==='ru'?'ru-RU':'en-GB')||'—'};
  return {
    archiveViews: createArchiveViews({...raceViews,trackName:views.trackName}),
    championshipViews: createChampionshipViews(raceViews),
    entityViews: createEntityViews({...raceViews,lang:language}),
    carsViews: createCarsViews({...modalApi,raw,state,route,language}),
    funViews: createFunViews(statsApi),
    bansViews: createBansViews(statsApi),
    editorialViews: createEditorialViews({...statsApi,language}),
    historyViews: createHistoryViews(statsApi)
  };
}
