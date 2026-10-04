import {copy,el} from "./dom.js?v=20261004p2";
import {subscribePreviewView} from "./runtime-events.js?v=20261004p2";
import {isServerStatusStale} from "../runtime/src/features/server-status/freshness.js";
import {compactServerLabel,orderServerRows} from "./server-display.js?v=20261004p2";

export function serverRow(item, stale=false, fallbackHref=null) {
  const row=el("button","preview-server-row");row.type="button";
  const line=el("span","preview-server-line");
  const dot=el("i",item.online&&!stale?"preview-dot":"preview-dot is-offline");dot.setAttribute("aria-hidden","true");
  const name=el("strong","",compactServerLabel(item));name.prepend(dot);row.title=item.label||item.key;
  line.append(name,el("span","",stale?"—":item.players));
  row.append(line,el("span","preview-server-track",item.track||"—"),
    el("span","preview-muted",`ACC SA ${item.sa??"—"} · ASG SR ${item.sr??"—"}`),
    el("span","preview-server-state",stale?copy("Данные устарели","Data is out of date"):item.online?(item.session||copy("Сервер открыт","Server is open")):copy("Сервер закрыт","Server is closed")));
  row.addEventListener("click",()=>{
    const legacy=[...document.querySelectorAll(".server-sticky-cards [data-server-key]")].find(node=>node.dataset.serverKey===item.key);
    if(legacy)legacy.click();
    else if(fallbackHref)location.assign(fallbackHref);
  });
  return row;
}

export function installServers(rail,main,homeHref) {
  const panel=el("section","preview-panel preview-servers");panel.id="preview-servers";
  const heading=el("h2","",copy("Серверы ASG","ASG servers"));
  const summary=el("p","preview-muted",copy("Загружаем статус…","Loading server status…"));
  const short=el("div","preview-server-list");
  const all=el("details","preview-all-servers");const label=el("summary","",copy("Все серверы","All servers"));const rest=el("div","preview-server-list");all.append(label,rest);
  panel.append(heading,summary,short,all);rail.append(panel);
  const mobile=el("details","preview-mobile-servers");const mobileLabel=el("summary","",copy("Статус серверов","Server status"));mobile.append(mobileLabel);
  const mobileList=el("div","preview-server-list");mobile.append(mobileList);main.querySelector(".hero,.hourly-home-v2")?.after(mobile);
  if(!mobile.isConnected)main.prepend(mobile);
  const nativeSource=document.querySelector("#server-sticky-widget");
  const render=({items:rawItems=[],stale=false})=>{
    const items=orderServerRows(rawItems),fallback=nativeSource?null:homeHref+'#preview-servers';
    const online=items.filter(i=>i.online).length,players=items.reduce((sum,i)=>sum+(Number(i.players)||0),0);
    summary.textContent=stale?copy("Нет актуальных данных","Current status is unavailable"):copy(`${online} онлайн · ${players} пилотов`,`${online} online · ${players} drivers`);
    mobileLabel.textContent=copy(`Серверы: ${stale?"—":online} онлайн · ${stale?"—":players} пилотов ↓`,`Servers: ${stale?"—":online} online · ${stale?"—":players} drivers ↓`);
    short.replaceChildren(...items.slice(0,3).map(i=>serverRow(i,stale,fallback)));
    rest.replaceChildren(...items.slice(3).map(i=>serverRow(i,stale,fallback)));all.hidden=items.length<=3;
    label.textContent=copy(`Все серверы · ${items.length}`,`All servers · ${items.length}`);
    mobileList.replaceChildren(...items.map(i=>serverRow(i,stale,fallback)));
  };
  if(nativeSource)subscribePreviewView("servers",render);
  else {
    // Secondary pages need only the public status snapshot, never auth commands.
    const update=async()=>{
      try{
        const response=await fetch("https://data.asgracing.ru/top-data/server_status.json",{cache:"no-store"});if(!response.ok)throw Error("status");
        const data=await response.json();const servers=data.servers||data;
        const items=Object.entries(servers).filter(([,s])=>s&&typeof s==="object"&&!Array.isArray(s)).map(([key,s])=>({key,label:s.short_name||s.label||s.name||key,track:s.track_name||s.track_code||s.track,online:["online","online_process_only"].includes(s.status),players:s.players_online??0,sa:s.sa_requirement??s.safety_rating_requirement,sr:s.sr_requirement??s.internal_sr_requirement,session:s.session_label||s.session_type}));
        render({items,stale:isServerStatusStale(data)});
      }catch{summary.textContent=copy("Статус временно недоступен","Status is temporarily unavailable");}
    };update();const timer=setInterval(update,60000);window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  }
  return panel;
}
