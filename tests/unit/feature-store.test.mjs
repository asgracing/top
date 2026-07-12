import test from "node:test";
import assert from "node:assert/strict";
import { createFeatureStore, createTableState, tablesReducer } from "../../src/shared/feature-store.js";

test("dispatches atomic table transitions", () => {
  const store = createFeatureStore(createTableState(["leaderboard"]), tablesReducer);
  store.dispatch({ type: "table/search", table: "leaderboard", value: "Javier" });
  store.dispatch({ type: "table/loading", table: "leaderboard" });
  assert.equal(store.getState().leaderboard.search, "Javier"); assert.equal(store.getState().leaderboard.page, 1); assert.equal(store.getState().leaderboard.status, "loading");
});
test("notifies and unsubscribes listeners", () => {
  const store = createFeatureStore(createTableState(["safety"]), tablesReducer); let calls = 0;
  const unsubscribe = store.subscribe(() => calls++); store.dispatch({ type: "table/page", table: "safety", page: 2 }); unsubscribe(); store.dispatch({ type: "table/page", table: "safety", page: 3 });
  assert.equal(calls, 1); assert.equal(store.subscriberCount, 0);
});
