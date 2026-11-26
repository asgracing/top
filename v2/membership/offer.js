import {localizeTree,tr} from './locale.js';
export function mountOffer(stats, card, {language="ru"}={}) {
  const $ = selector => document.querySelector(selector);
  const offer = $("#membership-offer").content.cloneNode(true);
  const pass = offer.querySelector(".membership-pass");
  const rotor = pass.querySelector(".pass-rotor");
  for (const face of ["front", "back"]) {
    const frame = document.createElement("span");
    frame.className = "pass-face face-" + face;
    frame.innerHTML = card;
    frame.querySelector(face === "front" ? ".pass-back" : ".pass-front").remove();
    frame.querySelector(".pass-" + face).hidden = false;
    const link = frame.querySelector("a");
    if (link) link.replaceWith(document.createTextNode("Racing Pass"));
    frame.setAttribute("aria-hidden", String(face === "back"));
    rotor.append(frame);
  }
  pass.addEventListener("click", () => {
    const flipped = pass.getAttribute("aria-pressed") !== "true";
    pass.setAttribute("aria-pressed", String(flipped));
    rotor.firstElementChild.setAttribute("aria-hidden", String(flipped));
    rotor.lastElementChild.setAttribute("aria-hidden", String(!flipped));
  });
  stats.append(offer);
  let info = stats.querySelector("[data-membership-details]");
  if (!info) {
    info = document.createElement("button");
    info.type = "button";
    info.className = "text-link";
    info.dataset.membershipDetails = "";
    info.textContent = tr("Сравнить подписки ↗",language);
    stats.querySelector(".panel-head").append(info);
  }
  stats.querySelector(".head-note").hidden = true;
  const supportPage = document.createElement("a");
  supportPage.className = "membership-more";
  supportPage.href = "/support/";
  supportPage.textContent = tr("Все возможности ↗",language);
  stats.querySelector(".membership-art").append(supportPage);
  const detail = $("#membership-detail");
  detail.querySelector(".membership-pass-full").innerHTML = card;

  detail.querySelector(".membership-detail-plans").append($(".membership-tiers").cloneNode(true));
  detail.querySelector(".tier-vip p").textContent = tr("Бонусы Supporter и анимированное оформление профиля. В разработке — резерв места на гоночных серверах и красный ник в игровом чате.",language);
  detail.querySelector(".tier-pro p").textContent = tr("Бонусы VIP, эксклюзивные фоны профиля и Racing Pass. В «Моём паддоке» можно закрепить лучшие заезды и показать свой прогресс.",language);
  for (const button of document.querySelectorAll("[data-membership-details]")) {
    button.addEventListener("click", () => detail.showModal());
  }
  detail.querySelector("[data-membership-close]").addEventListener("click", () => detail.close());
  detail.querySelector("[data-membership-flip]").addEventListener("click", event => {
    const front = detail.querySelector(".pass-front");
    front.hidden = !front.hidden;
    detail.querySelector(".pass-back").hidden = !front.hidden;
    event.currentTarget.textContent = front.hidden ? "Лицевая сторона ↻" : "Оборотная сторона ↻";
  });
  const trial = document.createElement("dialog");
  trial.id = "membership-trial";
  trial.setAttribute("aria-labelledby", "trial-title");
  trial.innerHTML = `<div class="membership-detail-head"><h2 id="trial-title"></h2><button type="button" aria-label="Закрыть">×</button></div>
    <div class="membership-detail-body"><div class="trial-showcase"></div><div class="trial-options" aria-label="Варианты оформления"></div><p class="trial-description"></p><a class="trial-checkout" target="_blank" rel="noopener">Оформить подписку ↗</a></div>`;
  document.body.append(trial);
  trial.querySelector(".membership-detail-head button").onclick = () => trial.close();
  for (const button of document.querySelectorAll("[data-membership-try]")) {
    button.onclick = () => {
      const tier = button.closest(".membership-tier");
      const name = tier.querySelector("h3").textContent;
      trial.querySelector("h2").textContent = tr("Попробовать",language) + " " + name;
      trial.querySelector(".trial-description").textContent = tier.querySelector("p").textContent;
      trial.querySelector(".trial-checkout").href = tier.querySelector("a").href;
      const preview = trial.querySelector(".trial-showcase");
      preview.className = "trial-showcase trial-" + name.toLowerCase();
      preview.dataset.look = "0";
      preview.innerHTML = name === "PRO" ? card : `<div class="trial-profile"><span class="trial-badge">${name}</span><h3>Apex Driver</h3><p>Demo Racing Team</p><b>#27</b><small>Гоночный номер закреплён</small></div>`;
      const options = trial.querySelector(".trial-options");
      options.replaceChildren();
      const labels = name === "Supporter" ? ["Значок Supporter", "Гоночный номер"] : name === "VIP" ? ["Сияние", "Градиент", "Пульс"] : ["Паддок", "Ночная трасса", "Закат"];
      labels.forEach((label, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.textContent = label;
        option.setAttribute("aria-pressed", String(index === 0));
        option.onclick = () => {
          preview.dataset.look = String(index);
          for (const sibling of options.children) sibling.setAttribute("aria-pressed", String(sibling === option));
        };
        options.append(option);
      });
      if (name === "PRO") {
        const flip = document.createElement("button");
        flip.type = "button";
        flip.textContent = tr("Перевернуть Racing Pass ↻",language);
        flip.onclick = () => {
          const front = preview.querySelector(".pass-front");
          front.hidden = !front.hidden;
          preview.querySelector(".pass-back").hidden = !front.hidden;
        };
        options.append(flip);
      }
      localizeTree(trial,language);
      trial.showModal();
    };
  }
  return ()=>{if(trial.open)trial.close();trial.remove();};
}
