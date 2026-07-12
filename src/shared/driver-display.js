export function splitDriverTeamTag(name) {
  const value = String(name || "-").trim();
  const match = value.match(/^(.*?)(\s*\[[^\]]+\])$/);
  if (!match || !match[1].trim()) return { name: value, team: "" };
  return { name: match[1].trim(), team: match[2].trim() };
}
