export function createFeatureStore(initialState, reducer) {
  let state = Object.freeze({ ...initialState });
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (!next || next === state) return state;
      const previous = state;
      state = Object.freeze({ ...next });
      for (const listener of listeners) listener(state, previous, action);
      return state;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get subscriberCount() { return listeners.size; }
  };
}

export function createTableState(tableNames, defaultPageSize = 10) {
  return Object.fromEntries(tableNames.map(name => [name, { page: 1, pageSize: defaultPageSize, search: "", sort: { key: null, direction: null }, status: "idle", error: null }]));
}

export function tablesReducer(state, action) {
  const current = state[action.table];
  if (!current) return state;
  const update = patch => ({ ...state, [action.table]: { ...current, ...patch } });
  if (action.type === "table/search") return update({ search: String(action.value || ""), page: 1 });
  if (action.type === "table/page") return update({ page: Math.max(1, Number(action.page) || 1) });
  if (action.type === "table/sort") return update({ sort: { key: action.key || null, direction: action.direction || null }, page: 1 });
  if (action.type === "table/loading") return update({ status: "loading", error: null });
  if (action.type === "table/ready") return update({ status: "ready", error: null });
  if (action.type === "table/error") return update({ status: "error", error: action.error || null });
  return state;
}
