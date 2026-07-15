import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";

const dist = resolve(import.meta.dirname, "../../dist");
const toPosix = path => path.split(sep).join("/");
const files = new Set();

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else files.add(toPosix(relative(dist, path)));
  }
}
await collect(dist);

const failures = [];
const checked = new Set();
const isExternal = value => /^(?:[a-z]+:|\/\/|#)/i.test(value);
function resolveReference(owner, rawReference) {
  const reference = rawReference.trim().replace(/["']/g, "").split(/[?#]/)[0];
  if (!reference || isExternal(reference) || reference.includes("{") || reference.includes("${")) return null;
  let path;
  if (reference.startsWith("/top/")) path = reference.slice(5);
  else if (reference === "/top" || reference === "/") path = "index.html";
  else if (reference.startsWith("/")) path = reference.slice(1);
  else path = toPosix(relative(dist, resolve(dist, dirname(owner), reference)));
  if (path.endsWith("/")) path += "index.html";
  else if (!extname(path) && files.has(`${path}/index.html`)) path += "/index.html";
  return path;
}
function check(owner, reference) {
  const path = resolveReference(owner, reference);
  if (!path) return;
  const key = `${owner} -> ${path}`;
  if (checked.has(key)) return;
  checked.add(key);
  if (!files.has(path)) failures.push(`Broken local reference: ${key}`);
}

for (const owner of files) {
  const extension = extname(owner);
  if (![".html", ".css", ".js"].includes(extension)) continue;
  const source = await readFile(resolve(dist, owner), "utf8");
  if (extension === ".html") {
    for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) check(owner, match[1]);
    for (const match of source.matchAll(/data-bg-options="([^"]+)"/g)) for (const option of match[1].split("|")) check(owner, option);
  } else if (extension === ".css") {
    for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) check(owner, match[1]);
  } else {
    for (const match of source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g)) check(owner, match[1]);
  }
}

if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log(`Reference regression passed: ${checked.size} local HTML/CSS/JS references`);
