import assert from "node:assert/strict";
import test from "node:test";

import { countLabel } from "../../src/pages/clubs-teams/catalog-page.js";

test("formats English member and race counts", () => {
  assert.equal(countLabel("en", "members", 1), "1 member");
  assert.equal(countLabel("en", "members", 2), "2 members");
  assert.equal(countLabel("en", "races", 1), "1 race");
  assert.equal(countLabel("en", "races", 0), "0 races");
});

test("formats Russian member and race counts", () => {
  assert.equal(countLabel("ru", "members", 1), "1 участник");
  assert.equal(countLabel("ru", "members", 2), "2 участника");
  assert.equal(countLabel("ru", "members", 5), "5 участников");
  assert.equal(countLabel("ru", "members", 11), "11 участников");
  assert.equal(countLabel("ru", "members", 21), "21 участник");
  assert.equal(countLabel("ru", "races", 1), "1 гонка");
  assert.equal(countLabel("ru", "races", 4), "4 гонки");
  assert.equal(countLabel("ru", "races", 12), "12 гонок");
});
