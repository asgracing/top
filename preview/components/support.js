import {copy,el} from "./dom.js?v=20261004p2";
export function installSupport(rail) {
  const panel=el("section","preview-panel preview-support");panel.id="preview-support";
  panel.append(el("h2","",copy("Поддержать ASG Racing","Support ASG Racing")),el("p","preview-muted",copy("Помогите оплачивать серверы и развивать гонки сообщества.","Help keep the servers running and improve community racing.")));
  const goal=document.querySelector("#donation-alerts-goal");if(goal)panel.append(goal);
  const action=el("a","preview-button",copy("Поддержать проект ↗","Support the project ↗"));
  action.href="https://www.donationalerts.com/r/asgracing";action.target="_blank";action.rel="noopener noreferrer";panel.append(action);
  const details=el("details","preview-support-details");details.append(el("summary","",copy("Благодарности и способы поддержки","Thanks and ways to support")));
  for(const selector of [".donation-alerts-special","#donation-alerts-list",".support-widget-qr-shell"]){const node=document.querySelector(selector);if(node)details.append(node);}
  if(details.children.length>1)panel.append(details);
  rail.append(panel);
  const stream=el("section","preview-panel preview-broadcast");stream.append(el("h2","",copy("Трансляции ASG","ASG broadcasts")),el("p","preview-muted",copy("Заезды и записи гонок — на канале сообщества.","Watch community races and recordings.")));
  const streamLink=el("a","preview-text-link",copy("Открыть трансляцию ↗","Watch the broadcast ↗"));streamLink.href="https://www.twitch.tv/asgracing";streamLink.target="_blank";streamLink.rel="noopener noreferrer";stream.append(streamLink);rail.append(stream);
}
