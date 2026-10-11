import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNotifications, notificationTarget } from "../../src/features/auth/personal-notifications.js";

test("private inbox allowlists event types and strips identity and arbitrary links", () => {
  const payload = normalizeNotifications({ linked: true, unread_count: 2, latest_id: 4, next_before: 2, items: [
    { id: 4, event_type: "invitation.team", actionable: true, details: { target_display_name: "Team <script>", initiated_by_public_id: "drv_abc", steam_id: "secret", url: "javascript:alert(1)" } },
    { id: 3, event_type: "ban.issued", read: true, details: { active_strikes: 0 } },
    { id: 2, event_type: "unknown" }, { id: -1, event_type: "ban.issued" },
  ] });
  assert.equal(payload.items.length, 2);
  assert.equal(payload.items[0].details.name, "Team <script>");
  assert.equal(payload.items[0].details.senderId, "drv_abc");
  assert.equal(payload.items[1].details.strikes, 0);
  assert.equal(payload.items[1].read, true);
  assert.doesNotMatch(JSON.stringify(payload), /steam_id|javascript:|secret/);
});
test("navigation uses verified profile and fixed account routes", () => {
  assert.equal(notificationTarget({ type: "ban.issued" }, "drv_abc", "en"), "/en/driver/?id=drv_abc");
  assert.equal(notificationTarget({ type: "invitation.team" }, "drv_abc"), "/account/");
  assert.equal(normalizeNotifications({ unread_count: -5 }).unread, 0);
});
