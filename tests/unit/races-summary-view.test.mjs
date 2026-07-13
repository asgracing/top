import test from "node:test";
import assert from "node:assert/strict";
import { createRacesSummaryView } from "../../src/pages/races/summary-view.js";

function setup() {
  const ids = ["races-total-count", "races-avg-active", "races-avg-overtakes", "races-top-winner", "races-latest-winner", "races-last-winner-best-lap", "races-last-winner-best-lap-note"];
  const nodes = new Map(ids.map(id => [id, { textContent: "", innerHTML: "" }]));
  const view = createRacesSummaryView({ documentRef: { getElementById: id => nodes.get(id) }, translate: key => key, renderDriverLink: value => `<a>${value}</a>` });
  return { view, nodes };
}

test("renders races summary values and driver links", () => {
  const { view, nodes } = setup();
  view.render({ total: 10, averageActive: "20.00", averageOvertakes: "5.00", topWinner: { name: "Top" }, latestRace: { winner: "Latest" }, latestBestLap: "1:47", latestBestLapCar: "Ferrari" });
  assert.equal(nodes.get("races-total-count").textContent, 10);
  assert.match(nodes.get("races-top-winner").innerHTML, /Top/);
  assert.equal(nodes.get("races-last-winner-best-lap-note").textContent, "Ferrari");
});

test("renders missing winners", () => {
  const { view, nodes } = setup();
  view.render({ total: "-", averageActive: "-", averageOvertakes: "-", latestBestLap: "-", latestBestLapCar: "" });
  assert.equal(nodes.get("races-top-winner").innerHTML, "noWinner");
  assert.equal(nodes.get("races-latest-winner").innerHTML, "noWinner");
});

test("rejects incomplete dependencies", () => {
  assert.throws(() => createRacesSummaryView({}), /complete rendering dependencies/);
});
