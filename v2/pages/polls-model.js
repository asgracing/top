// Poll identity and authority belong to the API; never derive a voter from storage.
export const POLL_COLORS = ['#69b8f7','#a992f5','#62d5ba','#e9b868','#e58ea5','#91bb6b','#79cfdf','#c2a0d8','#e6a178','#96aeea'];
export function pollStatus(poll, now = Date.now()) {
  if (['draft','cancelled','closed'].includes(poll.status)) return poll.status;
  if (Date.parse(poll.ends_at) <= now) return 'closed';
  if (Date.parse(poll.starts_at) > now) return 'scheduled';
  return poll.status === 'scheduled' ? 'active' : poll.status;
}
export function pollPercent(count, participants) {
  return participants > 0 ? Math.min(100, Math.max(0, 100 * count / participants)) : 0;
}
export function pollColor(option, index) {
  return POLL_COLORS.includes(option.color) ? option.color : POLL_COLORS[index % POLL_COLORS.length];
}
export function normalizePoll(value) {
  if (!value || typeof value.id !== 'string' || typeof value.title !== 'string'
    || !['single','multiple'].includes(value.mode) || !['draft','scheduled','active','closed','cancelled'].includes(value.status)
    || !Number.isSafeInteger(value.participants) || value.participants < 0
    || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.options)
    || value.options.length < 2 || value.options.length > 10) throw Error('invalid_poll');
  const ids = new Set();
  const options = value.options.map((option, index) => {
    if (!option || typeof option.id !== 'string' || ids.has(option.id) || typeof option.label !== 'string'
      || !Number.isSafeInteger(option.count) || option.count < 0 || option.count > value.participants) throw Error('invalid_poll');
    ids.add(option.id);
    return {...option, color: pollColor(option, index)};
  });
  if (!Number.isSafeInteger(value.max_choices) || value.max_choices < 1 || value.max_choices > options.length
    || (value.mode === 'single' && value.max_choices !== 1)) throw Error('invalid_poll');
  if (value.status !== 'draft' && (!Number.isFinite(Date.parse(value.starts_at)) || !Number.isFinite(Date.parse(value.ends_at))
    || Date.parse(value.starts_at) >= Date.parse(value.ends_at))) throw Error('invalid_poll');
  return {...value, description: String(value.description || ''), options};
}
export function validatePollDraft(draft) {
  if (!draft.title?.trim() || draft.title.trim().length > 200) return 'title';
  if ((draft.description || '').length > 2000) return 'description';
  const labels = draft.options.map(label => label.trim());
  if (labels.length < 2 || labels.length > 10 || labels.some(label => !label || label.length > 120)
    || new Set(labels.map(label => label.toLocaleLowerCase())).size !== labels.length) return 'options';
  if (!['single','multiple'].includes(draft.mode) || !Number.isInteger(draft.max_choices)
    || draft.max_choices < 1 || draft.max_choices > labels.length || (draft.mode === 'single' && draft.max_choices !== 1)) return 'choices';
  if (!Number.isFinite(draft.duration_hours) || draft.duration_hours < 1 / 60 || draft.duration_hours > 24 * 90) return 'duration';
  return null;
}
export function moscowInputToISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = Date.parse(value + ':00+03:00');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
export function pollRemaining(poll, language, now = Date.now()) {
  const status = pollStatus(poll, now);
  if (!['active','scheduled'].includes(status)) return null;
  const ms = Date.parse(status === 'scheduled' ? poll.starts_at : poll.ends_at) - now;
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  const d = Math.floor(minutes / 1440), h = Math.floor(minutes % 1440 / 60), m = minutes % 60;
  return language === 'en' ? (d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`)
    : (d ? `${d} д ${h} ч` : h ? `${h} ч ${m} мин` : `${m} мин`);
}
