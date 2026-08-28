export const MODERATION_ACTIONS = Object.freeze(["ban.issue", "strike.issue"]);

export const MODERATION_REASONS = Object.freeze([
  "dangerous_driving",
  "intentional_contact",
  "unsporting_conduct",
  "abusive_behavior",
  "cheating",
  "rule_violation",
  "other"
]);

const text = (value, max) => String(value ?? "").trim().slice(0, max);
const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;

export function normalizeModerationDriver(raw) {
  if (!raw || typeof raw !== "object") return null;
  const publicId = text(raw.public_id, 160);
  const displayName = text(raw.display_name, 160);
  const profileUrl = text(raw.profile_url, 512);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(publicId) || !displayName) return null;
  if (!profileUrl.startsWith("/driver/?id=")) return null;
  const moderation = raw.moderation && typeof raw.moderation === "object" ? raw.moderation : {};
  const strikes = Number(moderation.active_strikes);
  return {
    publicId,
    displayName,
    profileUrl,
    rank: finite(raw.rank),
    elo: finite(raw.elo),
    sr: finite(raw.sr),
    activeStrikes: Number.isInteger(strikes) && strikes >= 0 && strikes <= 100 ? strikes : 0,
    manuallyBanned: moderation.manually_banned === true,
    globalBanned: moderation.global_banned === true,
    protected: moderation.protected === true
  };
}

export function normalizeModerationSearch(payload) {
  return (Array.isArray(payload?.drivers) ? payload.drivers : [])
    .map(normalizeModerationDriver)
    .filter(Boolean)
    .slice(0, 20);
}

export function validateModerationDraft(draft) {
  const action = text(draft?.action, 32);
  const targetPublicId = text(draft?.targetPublicId, 160);
  const reasonCode = text(draft?.reasonCode, 64);
  const comment = text(draft?.comment, 1001);
  const evidenceUrl = text(draft?.evidenceUrl, 1001);
  const eventReference = text(draft?.eventReference, 241);
  if (!MODERATION_ACTIONS.includes(action)) return { ok: false, code: "invalid_action" };
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(targetPublicId)) return { ok: false, code: "target_required" };
  if (!MODERATION_REASONS.includes(reasonCode)) return { ok: false, code: "reason_required" };
  if (comment.length < 20 || comment.length > 1000) return { ok: false, code: "comment_length" };
  if (eventReference.length > 240) return { ok: false, code: "event_length" };
  if (evidenceUrl) {
    try {
      const url = new URL(evidenceUrl);
      if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("unsafe");
    } catch {
      return { ok: false, code: "evidence_url" };
    }
  }
  return {
    ok: true,
    value: {
      action,
      target_public_id: targetPublicId,
      reason_code: reasonCode,
      comment,
      evidence_url: evidenceUrl || null,
      event_reference: eventReference || null
    }
  };
}

export function createIdempotencyKey(cryptoRef = globalThis.crypto) {
  if (!cryptoRef?.getRandomValues) throw new Error("secure_random_unavailable");
  const bytes = new Uint8Array(18);
  cryptoRef.getRandomValues(bytes);
  return `web-${Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("")}`;
}
