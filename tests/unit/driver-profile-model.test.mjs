import test from "node:test";
import assert from "node:assert/strict";
import { buildDriverRankInfo, getDriverFavoriteCar } from "../../src/pages/driver/profile-model.js";

test("selects live Driver rank before summary rank", () => {
  const info = buildDriverRankInfo({ public_id: "p1", summary: { championship_rank: 8 } }, [{ public_id: "p1", rank: 2, rank_change: -1 }]);
  assert.deepEqual(info, { rank: 2, rankClass: "rank-2", change: -1 });
  assert.equal(buildDriverRankInfo({ summary: { championship_rank: 3 } }).rankClass, "rank-3");
});

test("selects the most frequent Driver car with a stable tie break", () => {
  const profile = { race_history: [{ car_name: "BMW" }, { car_name: "Ferrari" }, { car_name: "BMW" }, { car_name: " Ferrari " }] };
  assert.equal(getDriverFavoriteCar(profile), "BMW");
  assert.equal(getDriverFavoriteCar({}), null);
});
