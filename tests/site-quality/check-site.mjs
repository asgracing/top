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
const budgets = { important: [(css.match(/!important/g) || []).length, 106], silentCatch: [(js.match(/\.catch\(\(\)\s*=>\s*null\)/g) || []).length, 28], inlineStyle: [(html.match(/\bstyle=/g) || []).length, 10], directFetch: [(js.match(/\bfetch\s*\(/g) || []).length, 0], innerHtmlWrite: [(js.match(/\.innerHTML\s*=/g) || []).length, 139] };
for (const [name, [actual, maximum]] of Object.entries(budgets)) if (actual > maximum) failures.push(`${name} budget exceeded: ${actual} > ${maximum}`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log(JSON.stringify({ ids: ids.length, ...Object.fromEntries(Object.entries(budgets).map(([key, [value]]) => [key, value])) }, null, 2));
