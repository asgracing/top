const BASE = 'https://auth.asgracing.ru';
export function createPollsAPI({fetchRef = globalThis.fetch, timeout = 10000} = {}) {
  async function request(path, {method = 'GET', body, csrf, signal} = {}) {
    const response = await fetchRef(BASE + path, {
      method, credentials: 'include', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
      headers: {Accept: 'application/json', ...(body === undefined ? {} : {'Content-Type': 'application/json'}),
        ...(csrf ? {'X-CSRF-Token': csrf} : {})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)})
    });
    let payload; try { payload = await response.json(); } catch {}
    if (!response.ok) throw Object.assign(Error(typeof payload?.detail === 'string' ? payload.detail : 'request_failed'), {status: response.status});
    if (!payload || typeof payload !== 'object') throw Error('invalid_response');
    return payload;
  }
  const poll = id => '/v1/polls/' + encodeURIComponent(id);
  const admin = id => '/v1/admin/polls' + (id ? '/' + encodeURIComponent(id) : '');
  return {
    list: (query, signal) => request('/v1/polls?' + new URLSearchParams(query), {signal}),
    detail: (id, signal) => request(poll(id), {signal}),
    ballot: (id, signal) => request(poll(id) + '/ballot', {signal}),
    vote: (id, choices, revision, csrf) => request(poll(id) + '/ballot', {method: 'PUT', body: {choices, revision}, csrf}),
    withdraw: (id, revision, csrf) => request(poll(id) + '/ballot', {method: 'DELETE', body: {revision}, csrf}),
    adminList: (query, signal) => request(admin() + '?' + new URLSearchParams(query), {signal}),
    adminDetail: (id, signal) => request(admin(id), {signal}),
    save: (id, draft, csrf) => request(admin(id), {method: id ? 'PUT' : 'POST', body: draft, csrf}),
    action: (id, action, revision, csrf) => request(admin(id) + '/' + action, {method: 'POST', body: {revision}, csrf})
  };
}
