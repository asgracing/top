import {copy,el} from "./dom.js?v=20261004p2";
import {subscribePreviewView} from "./runtime-events.js?v=20261004p2";
export function installProfile() {
  const source=document.querySelector("#driver-stat-cards");if(!source)return;
  const metrics=el("section","preview-profile-metrics");metrics.setAttribute("aria-label",copy("Основные показатели пилота","Driver overview"));source.before(metrics);
  const details=el("details","preview-profile-details");details.append(el("summary","",copy("Вся статистика пилота","All driver statistics")));source.before(details);details.append(source);
  subscribePreviewView("profile",({profile,rank,elo,safety})=>{
    if(!profile){metrics.replaceChildren();return;}
    const values=[[copy("Место в рейтинге","Ranking position"),rank?.rank?`#${rank.rank}`:"—"],["ELO",elo?.rating??"—"],["Safety Rating",safety?.rating??"—"],[copy("Гонок","Races"),profile.summary?.races??"—"]];
    metrics.replaceChildren(...values.map(([name,value])=>{const card=el("div","preview-panel preview-metric");card.append(el("span","preview-label",name),el("strong","",value));return card;}));
  });
  const achievements=document.querySelector("#driver-achievements-widget");
  if(achievements){achievements.classList.add("preview-profile-achievements");achievements.setAttribute('aria-label',copy('Достижения','Achievements'));const label=achievements.querySelector('.widget-collapse-label');if(label)label.textContent=copy('Достижения','Achievements');document.querySelector(".driver-page-sections")?.before(achievements);}
}
