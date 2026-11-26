export const state = {
  revision: 1, tier: "pro", can_edit: true, paddock_version: 1, pass_editor_version: 2,
  effect: {header:"modern",preset:"violet",energy:115,paused:false,
    layers:{avatar:true,banner:true,cards:true,entry:true},cover:"track",
    pass_style:"holographic",pass_accent:"#b5ef70",pass_motto:"Демонстрационный профиль",pass_visible:true,
    pins:["demo:demo-0","demo:demo-1","demo:demo-2"]}
};
export const saveDemo = changes => {
  state.effect = {...state.effect,...changes};
  state.revision++;
  return structuredClone(state);
};
// Only the appearance editor in this prototype receives this transport.
export function createHttpClient() {
  return {async requestJson(url, options = {}) {
    if (url !== "https://auth.asgracing.ru/v1/me/profile-appearance") throw new Error("Unexpected demo request");
    if (options.method === "POST") {
      const body = JSON.parse(options.body);
      if (body.expected_revision !== state.revision) throw Object.assign(new Error("revision"),{status:409});
      saveDemo(body.effect);
    }
    return structuredClone(state);
  }};
}
