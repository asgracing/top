import test from "node:test";
import assert from "node:assert/strict";

import {
  createIdempotencyKey,
  normalizeModerationSearch,
  validateModerationDraft
} from "../../src/pages/moderation/moderation-model.js";

test("normalizes safe public pilot hints and drops private fields", () => {
  const result = normalizeModerationSearch({ drivers: [{
    public_id: "drv_target", display_name: "Target Pilot",
    profile_url: "/driver/?id=drv_target", rank: 12, elo: 1450, sr: 3.5,
    steam_id: "must-not-survive",
    moderation: { active_strikes: 2, manually_banned: false, global_banned: true, protected: false }
  }] });
  assert.equal(result.length, 1);
  assert.equal(result[0].publicId, "drv_target");
  assert.equal(result[0].activeStrikes, 2);
  assert.equal(result[0].globalBanned, true);
  assert.equal("steam_id" in result[0], false);
});

test("validates strict issue-only moderation drafts", () => {
  const valid = validateModerationDraft({
    action: "strike.issue", targetPublicId: "drv_target",
    reasonCode: "dangerous_driving", comment: "Repeated unsafe rejoins during the race.",
    evidenceUrl: "https://evidence.example/race/42", eventReference: "Main race"
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.evidence_url, "https://evidence.example/race/42");
  assert.equal(validateModerationDraft({ ...valid.value, action: "ban.remove" }).code, "invalid_action");
  assert.equal(validateModerationDraft({
    action: "ban.issue", targetPublicId: "drv_target", reasonCode: "other",
    comment: "A sufficiently detailed reason.", evidenceUrl: "https://u:p@example.test/e", eventReference: ""
  }).code, "evidence_url");
});

test("creates an opaque idempotency key from secure random bytes", () => {
  const cryptoRef = { getRandomValues(bytes) { bytes.fill(10); return bytes; } };
  const key = createIdempotencyKey(cryptoRef);
  assert.match(key, /^web-[0-9a-f]{36}$/);
});
