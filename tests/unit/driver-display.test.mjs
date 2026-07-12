import test from "node:test";
import assert from "node:assert/strict";
import { splitDriverTeamTag } from "../../src/shared/driver-display.js";

test("splits a trailing team tag", () => assert.deepEqual(splitDriverTeamTag("Javier Breogan.VR. [ASG]"), { name: "Javier Breogan.VR.", team: "[ASG]" }));
test("keeps an untagged driver intact", () => assert.deepEqual(splitDriverTeamTag("Valerka Kotov"), { name: "Valerka Kotov", team: "" }));
test("uses the empty fallback", () => assert.deepEqual(splitDriverTeamTag(""), { name: "-", team: "" }));
