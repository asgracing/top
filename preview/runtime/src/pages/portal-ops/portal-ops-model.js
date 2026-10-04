export const HOURLY_FIELDS = Object.freeze([
  "occurrence_id", "race_format", "points_multiplier", "race_start_local", "server_open_local", "track_code",
  "practice_minutes", "qualifying_minutes", "race_minutes", "pre_race_wait_seconds",
  "session_overtime_seconds", "server_window_minutes", "hour_of_day", "ambient_temp_c",
  "cloud_level", "rain_level", "weather_randomness"
]);

export function snapshotHourlyDraft(value) {
  return Object.freeze(Object.fromEntries(
    HOURLY_FIELDS.map(field => [field, value?.[field]])
  ));
}

export function hourlyDraftEquals(left, right) {
  return HOURLY_FIELDS.every(field => left?.[field] === right?.[field]);
}

const integer = (value, min, max) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
};
const finite = (value, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};
const localTime = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value || ""));

export function createIdempotencyKey(cryptoRef = globalThis.crypto) {
  if (!cryptoRef?.getRandomValues) throw new Error("secure_random_unavailable");
  const bytes = new Uint8Array(18); cryptoRef.getRandomValues(bytes);
  return `portal-${Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("")}`;
}

export function validateHourlyDraft(raw, trackCodes = []) {
  const value = {
    occurrence_id: String(raw?.occurrence_id || "").trim(),
    race_format: String(raw?.race_format || "").trim().toLowerCase(),
    points_multiplier: finite(raw?.points_multiplier, 0, 100),
    race_start_local: String(raw?.race_start_local || ""),
    server_open_local: String(raw?.server_open_local || ""),
    track_code: String(raw?.track_code || "").trim(),
    practice_minutes: integer(raw?.practice_minutes, 1, 720),
    qualifying_minutes: integer(raw?.qualifying_minutes, 1, 720),
    race_minutes: integer(raw?.race_minutes, 1, 1440),
    pre_race_wait_seconds: integer(raw?.pre_race_wait_seconds, 0, 3600),
    session_overtime_seconds: integer(raw?.session_overtime_seconds, 0, 3600),
    server_window_minutes: integer(raw?.server_window_minutes, 1, 2880),
    hour_of_day: integer(raw?.hour_of_day, 0, 23), ambient_temp_c: integer(raw?.ambient_temp_c, 10, 40),
    cloud_level: finite(raw?.cloud_level, 0, 1), rain_level: finite(raw?.rain_level, 0, 1),
    weather_randomness: integer(raw?.weather_randomness, 0, 7)
  };
  if (!/^[\x21-\x7e]{1,160}$/.test(value.occurrence_id)) return { ok: false, code: "invalid_event" };
  if (!["hourly", "endurance"].includes(value.race_format)) return { ok: false, code: "invalid_event_type" };
  if (!localTime(value.race_start_local) || !localTime(value.server_open_local)) return { ok: false, code: "invalid_time" };
  const start = Date.parse(`${value.race_start_local}:00+03:00`);
  const open = Date.parse(`${value.server_open_local}:00+03:00`);
  const lead = (start - open) / 60000;
  if (!Number.isFinite(lead) || lead < 1 || lead > 360) return { ok: false, code: "invalid_open_time" };
  if (!trackCodes.includes(value.track_code)) return { ok: false, code: "invalid_track" };
  if (Object.entries(value).some(([key, field]) => !["occurrence_id", "race_start_local", "server_open_local", "track_code"].includes(key) && field === null)) return { ok: false, code: "invalid_range" };
  const minimumWindow = value.practice_minutes + value.qualifying_minutes + value.race_minutes
    + Math.ceil((value.pre_race_wait_seconds + value.session_overtime_seconds) / 60);
  if (value.server_window_minutes < minimumWindow) return { ok: false, code: "window_too_short", minimumWindow };
  return { ok: true, value, minimumWindow };
}

export function normalizeHourlyState(payload) {
  if (!payload?.available || !Array.isArray(payload.events) || !Array.isArray(payload.tracks)) return null;
  return {
    stale: payload.stale === true,
    revision: /^[0-9a-f]{64}$/.test(payload.schedule_revision || "") ? payload.schedule_revision : null,
    generatedAt: String(payload.generated_at || ""), tracks: payload.tracks,
    events: payload.events.map(event => {
      const championship = event?.competition_mode === "championship"
        || String(event?.occurrence_id || "").startsWith("championship_");
      const raceFormat = ["hourly", "endurance"].includes(event?.race_format)
        ? event.race_format : "hourly";
      return {
        ...event,
        race_format: raceFormat,
        competition_mode: championship ? "championship" : "standalone",
        points_multiplier: Number.isFinite(Number(event?.points_multiplier))
          ? Number(event.points_multiplier) : (championship ? 1 : raceFormat === "endurance" ? 10 : 5),
        editable: event?.editable !== false && !championship
      };
    })
  };
}

export function isSafeLogoPreview(value, mediaType) {
  return typeof value === "string" && value.length <= 300000
    && ["image/png", "image/jpeg"].includes(mediaType)
    && value.startsWith(`data:${mediaType};base64,`);
}

export function validateClubsCommand(entity, action, memberPublicId, reason) {
  if (!entity || !["club", "team"].includes(entity.entity_type)
      || !/^[A-Za-z0-9_-]{1,160}$/.test(String(entity.public_id || ""))
      || !Number.isInteger(entity.row_version) || entity.row_version < 1) {
    return { ok: false, code: "invalid_entity" };
  }
  const [commandType, decision = ""] = String(action || "").split(":");
  const allowed = new Set([
    "portal.entity.revision_decide", "portal.entity.logo_decide",
    "portal.membership.admin_add", "portal.membership.admin_remove"
  ]);
  if (!allowed.has(commandType)) return { ok: false, code: "invalid_action" };
  const normalizedReason = String(reason || "").trim();
  const payload = { entity_type: entity.entity_type, entity_public_id: entity.public_id };
  if (commandType.startsWith("portal.entity.")) {
    if (!["approved", "rejected"].includes(decision)) return { ok: false, code: "invalid_action" };
    if (commandType === "portal.entity.revision_decide" && !entity.pending_revision) return { ok: false, code: "revision_not_pending" };
    if (commandType === "portal.entity.logo_decide" && !entity.pending_logo) return { ok: false, code: "logo_revision_not_pending" };
    if (decision === "rejected" && normalizedReason.length < 3) return { ok: false, code: "reason_required" };
    Object.assign(payload, { decision, reason: normalizedReason });
  } else {
    const member = String(memberPublicId || "").trim();
    if (!/^drv_[A-Za-z0-9_-]{1,156}$/.test(member)) return { ok: false, code: "invalid_member" };
    if (normalizedReason.length < 3) return { ok: false, code: "reason_required" };
    Object.assign(payload, { member_public_id: member, reason: normalizedReason });
  }
  return { ok: true, commandType, expectedEntityVersion: entity.row_version, payload };
}
