import {localizeTree} from './locale.js';
import {openAppearanceEditor} from "/v2/pages/profile-appearance-editor.js";
import {createProfileEffect,appendBadge} from "/v2/pages/profile-effects.js";
import {setProfileLayout,profileHeaderImage} from "/v2/pages/profile-studio-layout.js";
import {mountDriverSupport} from "/v2/pages/driver-support.js";
import {demoDriver} from "./demo-card.js";
import {state,saveDemo} from "./demo-state.js";
import {nativeCss,nativeHero,trackAssets} from "native-demo-assets";


export async function mountProfileDemo(host, {language="ru"}={}) {
const text=(ru,en)=>language==="en"?en:ru;



host.dataset.v2 = "home";
const shadow = host.attachShadow({mode:"open"});
shadow.innerHTML = `<style>${nativeCss}</style><div class="native-demo-content">
  <button class="button native-open-editor" type="button">Открыть оформление профиля</button>
  <div class="editor-anchor"></div>
  <div id="page-view"><div class="profile-workspace"><div class="profile-main">${nativeHero}
    <section class="panel page-panel"><div class="profile-stat-grid">${[["Очки",1840],["Гонки",84],["Победы",12],["Подиумы",31]].map(([name,value])=>`<div class="page-metric" data-profile-key-metric><span>${name}</span><b>${value}</b></div>`).join("")}</div></section>
    <section class="panel page-panel profile-analysis"><h2>Мой паддок</h2><div class="profile-pro-workspace"></div></section>
  </div></div></div>
  <p class="page-help">Apex Driver — вымышленный пилот. Настройки этого примера действуют только на этой странице.</p>
</div>`;
localizeTree(shadow,language);
const view = shadow.querySelector("#page-view");
const hero = view.querySelector(".profile-hero");
const discipline = document.createElement("div");
discipline.className = "profile-discipline";
discipline.innerHTML = '<h2 class="eyebrow">Форма и дисциплина</h2><div class="profile-discipline-grid"><div class="page-metric"><span>Страйки</span><b>0</b></div><div class="page-metric"><span>Штрафы</span><b>0</b></div></div>';
hero.append(discipline);
appendBadge(hero.querySelector("h1"),"pro");
const animation = createProfileEffect(view);
function applyAppearance() {
  const modern = state.effect.header === "modern";
  hero.dataset.profileHeader = modern ? "modern" : "classic";
  setProfileLayout(view,hero,modern,text);
  hero.style.setProperty("--studio-hero-image",profileHeaderImage(document));
  if (state.effect.cover === "track") delete host.dataset.profileProCover;
  else host.dataset.profileProCover = state.effect.cover;
  void animation.update(state.effect,{enter:true});
}
applyAppearance();
const now = "2026-11-26T12:00:00Z";
const profile = {...demoDriver,public_id:"drv_demo", race_history:Array.from({length:8},(_,i)=>({
  race_id:"demo-"+i,source:"demo",finished_at:`2026-11-${String(25-i).padStart(2,"0")}T12:00:00Z`,
  track_code:"monza",car_name:"Ford Mustang GT3",car_model_id:36,
  start_position:8-i%4,position:1+i%5,positions_delta:5-i%3,
  points:18+i,best_lap_ms:109500-i*130,elo:1280+i,elo_rating_delta:8+i
}))};
const paddock = shadow.querySelector(".profile-pro-workspace");
mountDriverSupport({root:paddock,profile,language,now,owner:true,advanced:true,settings:state.effect,
  async onSave(changes) {saveDemo(changes);applyAppearance();}
});
let editorSession;
function openEditor() {
  if (editorSession) {
    shadow.querySelector(".profile-appearance-editor").scrollIntoView({block:"nearest",behavior:"smooth"});
    return;
  }
  editorSession = new AbortController();
  shadow.querySelector(".native-open-editor").hidden = true;
  openAppearanceEditor({view:shadow.querySelector(".editor-anchor"),
    auth:{driver:{displayName:demoDriver.driver},preferences:{raceNumber:27},csrfToken:"local-demo"},
    text,signal:editorSession.signal,
    onClose(){editorSession.abort();editorSession=null;shadow.querySelector(".native-open-editor").hidden=false;},
    onSave:applyAppearance
  });
}
shadow.querySelector(".native-open-editor").onclick = openEditor;
host.addEventListener("profile-demo-open",event=>{
  if(event.detail==="pro") paddock.querySelector('[data-section="style"]').click();
  else openEditor();
  host.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
});
localizeTree(shadow,language);
openEditor();

return {open(tier){if(tier==="pro")paddock.querySelector('[data-section="style"]').click();else openEditor();},destroy(){editorSession?.abort();animation.destroy();host.replaceChildren();}};
}
