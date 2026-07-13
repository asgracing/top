import test from "node:test";
import assert from "node:assert/strict";
import { createCarsSummaryView } from "../../src/pages/cars/summary-view.js";

function setup() {
  const ids = ["cars-total-count", "cars-top-winner", "cars-most-used", "cars-hero-spotlight", "cars-hero-spotlight-media", "cars-hero-spotlight-name", "cars-hero-spotlight-races", "cars-hero-spotlight-wins"];
  const nodes = new Map(ids.map(id => [id, { textContent: "", innerHTML: "", hidden: false, replaceChildren() { this.innerHTML = ""; } }]));
  const view = createCarsSummaryView({ documentRef: { getElementById: id => nodes.get(id) }, renderCarLink: value => `<a>${value}</a>`, renderCarImage: row => `<img alt="${row.car_name}">` });
  return { view, nodes };
}

test("renders winner and most-used car independently", () => {
  const { view, nodes } = setup();
  view.render([{ car_name: "Winner", races: 2, wins: 2 }, { car_name: "Popular", races: 10, wins: 1 }]);
  assert.match(nodes.get("cars-top-winner").innerHTML, /Winner/);
  assert.match(nodes.get("cars-most-used").innerHTML, /Popular/);
  assert.equal(nodes.get("cars-hero-spotlight-races").textContent, "10");
});

test("renders an empty summary", () => {
  const { view, nodes } = setup();
  view.render([]);
  assert.equal(nodes.get("cars-total-count").textContent, "—");
  assert.equal(nodes.get("cars-hero-spotlight").hidden, true);
});

test("rejects incomplete dependencies", () => {
  assert.throws(() => createCarsSummaryView({}), /complete rendering dependencies/);
});
