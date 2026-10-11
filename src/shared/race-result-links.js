// A public result reference must carry every namespace used by its modal.
const validId = value => /^[a-z0-9_.-]{1,160}$/i.test(value || '');
const validSeason = value => /^[a-z0-9_-]{1,128}$/i.test(value || '');
const validFile = value => /^races\/[a-z0-9_./-]+\.json$/i.test(value || '') && !value.split('/').some(part => part === '..' || part === '.' || !part);
const missing = () => Object.assign(new Error('Invalid race reference'), {status: 404});
export const resultTab = value => value === 'qualifying' ? 'qualifying' : 'race';

export function raceLinkSummary(params) {
  const id = params.get('id'), source = params.get('source') || 'top';
  if (!validId(id) || !['top', 'hourly', 'season'].includes(source)) throw missing();
  const file = params.get('file'), season = params.get('season'), published = params.get('published'), publishedFile = params.get('published_file');
  if ((file && !validFile(file)) || (source === 'season' && !validSeason(season)) || (published && !validId(published)) || (publishedFile && (!published || !validFile(publishedFile)))) throw missing();
  return {race_id: id, _data_namespace: source,
    ...(file ? {details_path: file} : {}),
    ...(source === 'season' ? {_season_slug: season, competition_mode: 'championship',
      ...(published ? {_published_race: {race_id: published, details_path: publishedFile || `races/${published}.json`}} : {})} : {})};
}

export function raceResultUrl(race, tab = 'race', language = 'ru') {
  const source = race._data_namespace === 'season' ? 'season' : race._data_namespace === 'hourly' ? 'hourly' : 'top';
  const id = race.race_id || race.race_uid;
  if (!validId(id)) throw missing();
  const params = new URLSearchParams({id});
  if (source !== 'top') params.set('source', source);
  if (source === 'season') {
    params.set('season', race._season_slug || '');
    if (race._published_race?.race_id) {
      params.set('published', race._published_race.race_id);
      const file = race._published_race.details_path;
      if (file && file !== `races/${race._published_race.race_id}.json`) params.set('published_file', file);
    }
  }
  const defaultFile = source === 'top' ? `races/details/${id}.json` : `races/${id}.json`;
  if (race.details_path && race.details_path !== defaultFile) params.set('file', race.details_path);
  // Validate copied references by the exact same rules as the public loader.
  raceLinkSummary(params);
  if (resultTab(tab) === 'qualifying') params.set('tab', 'qualifying');
  return `https://asgracing.ru/${language === 'en' ? 'en/' : ''}race/?${params}`;
}
