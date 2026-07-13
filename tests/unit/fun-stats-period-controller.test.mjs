import test from "node:test";
import assert from "node:assert/strict";
import { createFunStatsPeriodController } from "../../src/pages/fun-stats/period-controller.js";

test("changes Fun Stats period through the owned lifecycle listener", () => {
  const button = { dataset: { funPeriod: "month" } };
  let period = "week";
  let listener;
  let renders = 0;
  const controller = createFunStatsPeriodController({ documentRef: { querySelectorAll: () => [button] }, getPeriod: () => period, setPeriod: value => { period = value; }, renderPage: () => { renders += 1; }, applyReveal() {} });
  controller.bind({ listen: (_target, _type, callback) => { listener = callback; } });
  listener();
  assert.equal(period, "month");
  assert.equal(renders, 1);
  listener();
  assert.equal(renders, 1);
});

test("validates Fun Stats period controller contracts", () => {
  assert.throws(() => createFunStatsPeriodController({}), /complete dependencies/);
  const controller = createFunStatsPeriodController({ documentRef: { querySelectorAll: () => [] }, getPeriod() {}, setPeriod() {}, renderPage() {}, applyReveal() {} });
  assert.throws(() => controller.bind(null), /requires a lifecycle/);
});
