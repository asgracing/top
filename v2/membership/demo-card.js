import { passCard } from "/v2/pages/profile-racing-pass.js";

// Fictional promotional profile. No account, avatar or public driver identifier.
export const demoDriver = {
  driver: "Apex Driver", teamName: "Demo Racing Team", race_number: 27,
  elo: 1280, elo_category_id: 2, safety_rating: 8.42,
  races: 84, wins: 12, podiums: 31, points: 1840
};
export const demoCard = renderDemoCard();
export function renderDemoCard(language="ru") {return passCard({
  profile: demoDriver,
  settings: {pass_style:"holographic", pass_accent:"#b5ef70", pass_motto:language==="en"?"Fictional profile":"Демонстрационный профиль"},
  side: "front", text: (ru,en) => language==="en"?en:ru
}).replace(/<a href="[^"]*">[^<]*<\/a>/, language==="en"?"<span>Fictional profile</span>":"<span>Демонстрационный профиль</span>");
}
