import {localizeTree} from './locale.js';
// The live preview and the saved HTML use the same component and native data.
export function mountProjectStats(panel, stats, funding, {language="ru"}={}) {
  const side = document.createElement("div");
  side.className = "membership-side-body project-summary";
  side.innerHTML = `
    <div class="project-counts"></div>
    <section class="project-pilot" aria-label="Пилот дня">
      <span class="project-pilot-mark" aria-hidden="true"></span>
      <div class="project-pilot-copy"><small>Пилот дня</small><span class="project-pilot-slot"></span>
        <div class="project-ratings"></div></div>
    </section>
    <button type="button" class="membership-chart" data-modal="online" aria-haspopup="dialog"><span class="eyebrow">Онлайн по датам <i aria-hidden="true">↗</i></span><span class="chart"></span></button>
    <section class="project-goal" aria-label="Сбор средств">
      <div class="project-goal-heading"><small>Цель сбора</small><b class="project-percent"></b></div>
      <strong class="project-goal-title"></strong>
      <div class="project-amount"><b></b> <span></span></div>
      <progress max="100" aria-label="Прогресс сбора"></progress>
      <div class="project-donations" hidden><small>Последние донаты</small><div class="project-donor-list"></div></div>
    </section>`;
  localizeTree(side,language);
  const trophy = document.querySelector("#v2-ranking .head-icon svg");
  if (trophy) side.querySelector(".project-pilot-mark").append(trophy.cloneNode(true));
  for (const selector of [".support-cta", ".qr-section"]) side.append(funding.querySelector(selector).cloneNode(true));
  const previous = panel.querySelector(".membership-side-body");
  if (previous) previous.replaceWith(side);
  else panel.append(side);

  const observers=[];
  function watch(node, update) {
    update();
    const observer=new MutationObserver(update);
    observer.observe(node, {subtree:true, childList:true, characterData:true, attributes:true});observers.push(observer);
  }
  const metrics = stats.querySelector("#v2-metrics");
  watch(metrics, () => {
    const items = Array.from(metrics.children, child => child.cloneNode(true));
    const labels = language==="en"?["Drivers","Races","Online"]:["Пилоты", "Гонки", "Онлайн"];
    items.forEach((item, index) => {
      const label = item.querySelector("span");
      if (!label || !labels[index]) return;
      item.title = label.textContent;
      label.textContent = labels[index];
    });
    side.querySelector(".project-counts").replaceChildren(...items);
  });
  const history = stats.querySelector("#v2-chart");
  watch(history, () => side.querySelector(".chart").replaceChildren(...Array.from(history.children, child => child.cloneNode(true))));
  const nativePilot = stats.querySelector("#v2-day-driver");
  const pilotParent=nativePilot.parentNode,pilotNext=nativePilot.nextSibling;
  const pilotClass=nativePilot.className,pilotPopup=nativePilot.getAttribute("aria-haspopup");
  nativePilot.classList.add("project-pilot-name");
  nativePilot.setAttribute("aria-haspopup", "dialog");
  side.querySelector(".project-pilot-slot").replaceWith(nativePilot);
  const donations = funding.querySelector("#v2-donations");
  watch(donations, () => {
    const entries = Array.from(donations.querySelectorAll(".donation-row")).slice(0, 3);
    side.querySelector(".project-donations").hidden = !entries.length;
    side.querySelector(".project-donor-list").replaceChildren(...entries.map(entry => {
      const row = document.createElement("div");
      row.className = "project-donor";
      const name = document.createElement("b");
      name.textContent = entry.querySelector("b")?.textContent.trim() || "Аноним";
      name.title = name.textContent;
      const amount = document.createElement("strong");
      amount.textContent = entry.querySelector("strong")?.textContent.trim() || "";
      row.append(name, amount);
      return row;
    }));
  });
  const ratings = stats.querySelector("#v2-day-ratings");
  watch(ratings, () => {
    const badges = Array.from(ratings.querySelectorAll(".rating-badge"), original => {
      const badge = document.createElement("span");
      badge.className = original.className;
      badge.textContent = original.textContent.trim();
      return badge;
    });
    side.querySelector(".project-ratings").replaceChildren(...badges);
  });

  const title = funding.querySelector("#v2-goal-name");
  const raised = funding.querySelector("#v2-fund-value");
  const total = funding.querySelector("#v2-fund-total");
  const percent = funding.querySelector("#v2-fund-percent");
  function renderGoal() {
    const fullTitle = title.textContent.trim();
    const name = side.querySelector(".project-goal-title");
    name.textContent = fullTitle.replace(/\s*\/\s*Support the Project!.*$/i, "") || "Цель уточняется";
    name.title = fullTitle;
    side.querySelector(".project-amount b").textContent = raised.textContent;
    side.querySelector(".project-amount span").textContent = total.textContent;
    side.querySelector(".project-percent").textContent = percent.textContent;
    const bar = side.querySelector("progress");
    bar.hidden = !percent.textContent.trim();
    if (!bar.hidden) bar.value = Number.parseFloat(percent.textContent);
  }
  renderGoal();
  const observer = new MutationObserver(renderGoal);
  for (const node of [title, raised, total, percent]) observer.observe(node, {subtree:true, childList:true, characterData:true});
  observers.push(observer);
  return ()=>{observers.forEach(o=>o.disconnect());pilotParent.insertBefore(nativePilot,pilotNext);nativePilot.className=pilotClass;if(pilotPopup===null)nativePilot.removeAttribute("aria-haspopup");else nativePilot.setAttribute("aria-haspopup",pilotPopup);side.remove();};
}
