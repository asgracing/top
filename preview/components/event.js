import {copy,el,observeContent} from "./dom.js?v=20261004p2";
import {subscribePreviewView} from "./runtime-events.js?v=20261004p2";
export function installEvent() {
  const root=document.querySelector("#hourly-upcoming-v2");if(!root)return;
  root.classList.add("preview-event");
  const inner=root.querySelector(".hourly-upcoming-v2-inner");const header=root.querySelector(".hourly-upcoming-v2-header");const grid=root.querySelector("#hourly-upcoming-v2-info-grid");const footer=root.querySelector("#hourly-upcoming-v2-footer");
  const art=el("div","preview-event-art");art.append(header);const participation=el("div","preview-event-participation");const metrics=el("dl","preview-event-metrics");participation.append(el("p","preview-eyebrow",copy("Готов к старту?","Ready to race?")),el("h3","",copy("Условия участия","Race entry")),metrics,footer);
  inner.replaceChildren(art,participation,grid);
  subscribePreviewView("event",({data,model})=>{
    const restriction=data.car_restriction||data.rules?.car_model;
    const admission=restriction?.mode==='single_model'?model.carModel:`${copy("Все","All")} ${model.carClass}`;
    const values=[[copy("Допустимые машины","Eligible cars"),admission],["ACC SA",model.safetyRating??"—"],[copy("Квалификация","Qualifying"),model.qualifyingMinutes==null?"—":`${model.qualifyingMinutes} ${copy("мин","min")}`],[copy("Гонка","Race"),model.raceMinutes==null?"—":`${model.raceMinutes} ${copy("мин","min")}`]];
    metrics.replaceChildren(...values.map(([name,value])=>{const pair=el("div");pair.append(el("dt","preview-label",name),el("dd","",value));return pair;}));
  });
  observeContent(grid,()=>{
    for(const card of grid.querySelectorAll(":scope > .event-details-v2-card-format,:scope > .event-details-v2-card-conditions")){
      const details=el("details","preview-event-details");details.append(el("summary","",card.querySelector(".event-details-v2-card-title")?.textContent||copy("Параметры гонки","Race parameters")));card.before(details);details.append(card);
    }
  });
}
