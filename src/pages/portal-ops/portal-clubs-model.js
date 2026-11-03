import { normalizeRevisionFields } from '../account/clubs-teams-command-model.js?v=20260910msk1';
import { validateClubsCommand } from './portal-ops-model.js?v=20261004teams1';

export function managementCommand({ entity, action, entityType, fields, leaderId, clubId, memberId, reason }) {
  const why = String(reason || '').trim();
  if (why.length > 1000) return { ok: false, code: 'reason_required' };
  if (action.includes('_decide:') || action.startsWith('portal.membership.')) {
    return validateClubsCommand(entity, action, memberId, why);
  }
  if (why.length < 3) return { ok: false, code: 'reason_required' };
  const creating = action === 'portal.entity.create';
  const type = creating ? entityType : entity?.entity_type;
  if (!['club', 'team'].includes(type)) return { ok: false, code: 'invalid_entity' };
  if (!creating && (!entity || !Number.isSafeInteger(entity.row_version) || entity.row_version < 1)) return { ok: false, code: 'invalid_entity' };
  if (!creating && entity.status === 'archived') return { ok: false, code: 'entity_archived' };
  const payload = { entity_type: type, ...(creating ? {} : { entity_public_id: entity.public_id }), reason: why };
  if (creating || action === 'portal.entity.update') {
    try { payload.fields = normalizeRevisionFields(fields); }
    catch (error) { return { ok: false, code: error.code || 'invalid_fields' }; }
  }
  if (creating) {
    if (!/^drv_[A-Za-z0-9_-]{1,156}$/.test(leaderId || '')) return { ok: false, code: 'invalid_member' };
    payload.leader_public_id = leaderId;
    payload.club_public_id = type === 'team' ? clubId || null : null;
  } else if (action === 'portal.leadership.transfer') {
    if (!(entity.members || []).some(member => member.public_id === memberId && member.role === 'member')) return { ok: false, code: 'not_member' };
    payload.member_public_id = memberId;
  } else if (action.startsWith('portal.entity.set_status:')) {
    const status = action.split(':')[1];
    const allowed = { approved: ['suspended', 'archived'], suspended: ['approved', 'archived'], pending: ['archived'], rejected: ['archived'] };
    if (!allowed[entity.status]?.includes(status)) return { ok: false, code: 'invalid_transition' };
    payload.status = status;
  } else if (action === 'portal.team.set_club') {
    if (type !== 'team') return { ok: false, code: 'invalid_entity' };
    payload.club_public_id = clubId || null;
  } else if (action !== 'portal.entity.logo_clear' && action !== 'portal.entity.update') return { ok: false, code: 'invalid_action' };
  return { ok: true, commandType: action.split(':')[0], payload, expectedEntityVersion: creating ? 0 : entity.row_version };
}

export function filterManagedEntities(entities, { query = '', type = '', status = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return entities.filter(entity => (!type || entity.entity_type === type)
    && (!status || (status === 'review' ? entity.pending_revision || entity.pending_logo : entity.status === status))
    && (!needle || `${entity.display_name} ${entity.public_id} ${entity.slug}`.toLocaleLowerCase().includes(needle)));
}
