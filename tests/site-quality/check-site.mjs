import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const [html, css, js] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "app.js"), "utf8")
]);
const failures = [];
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) failures.push(`Duplicate HTML ids: ${duplicates.join(", ")}`);

const dialogTags = [...html.matchAll(/<[^>]+\brole="dialog"[^>]*>/g)].map(match => match[0]);
for (const [index, tag] of dialogTags.entries()) {
  if (!/\baria-modal="true"/.test(tag)) failures.push(`Dialog ${index + 1} is missing aria-modal="true"`);
  const labelledBy = tag.match(/\baria-labelledby="([^"]+)"/)?.[1];
  if (!labelledBy) failures.push(`Dialog ${index + 1} is missing aria-labelledby`);
  else if (!ids.includes(labelledBy)) failures.push(`Dialog ${index + 1} references missing label id: ${labelledBy}`);
  const describedBy = tag.match(/\baria-describedby="([^"]+)"/)?.[1];
  if (describedBy && !ids.includes(describedBy)) failures.push(`Dialog ${index + 1} references missing description id: ${describedBy}`);
}
if (/<th[^>]*\brole="button"/i.test(html) || /<th[^>]*\brole=["']button["']/i.test(js)) {
  failures.push("Sortable table headers must use nested native buttons instead of th role=button");
}
if (!css.includes(".table-sort-button:focus-visible")) failures.push("Sortable table buttons are missing a visible focus style");
if (!css.includes("@media (pointer: coarse)")) failures.push("Coarse-pointer touch targets are missing");
const budgets = { important: [(css.match(/!important/g) || []).length, 106], silentCatch: [(js.match(/\.catch\(\(\)\s*=>\s*null\)/g) || []).length, 28], inlineStyle: [(html.match(/\bstyle=/g) || []).length, 10], directFetch: [(js.match(/\bfetch\s*\(/g) || []).length, 0], innerHtmlWrite: [(js.match(/\.innerHTML\s*=/g) || []).length, 91] };
for (const [name, [actual, maximum]] of Object.entries(budgets)) if (actual > maximum) failures.push(`${name} budget exceeded: ${actual} > ${maximum}`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log(JSON.stringify({ ids: ids.length, dialogs: dialogTags.length, ...Object.fromEntries(Object.entries(budgets).map(([key, [value]]) => [key, value])) }, null, 2));
