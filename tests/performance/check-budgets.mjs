import { readFile, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const budgets = JSON.parse(await readFile(resolve(root, "performance-budgets.json"), "utf8"));

async function fileBytes(path) {
  return (await stat(resolve(root, path))).size;
}

async function treeBytes(path, extensions) {
  const directory = resolve(root, path);
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) total += await treeBytes(child, extensions);
    else if (extensions.has(extname(entry.name))) total += await fileBytes(child);
  }
  return total;
}

const [html, appSource, featureLoaderSource] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "app.js"), "utf8"),
  readFile(resolve(root, "src/runtime/page-feature-loader.js"), "utf8"),
]);
const videos = ["media/background.mp4", "media/background_nurb24h.mp4"];
const metrics = {
  appJavaScriptBytes: await fileBytes("app.js"),
  sourceModulesBytes: await treeBytes("src", new Set([".js", ".mjs"])),
  stylesheetsBytes: await treeBytes("styles", new Set([".css"])) + await fileBytes("styles.css") + await fileBytes("legal.css"),
  homeHtmlBytes: Buffer.byteLength(html),
  backgroundVideoBytes: Math.max(...await Promise.all(videos.map(fileBytes))),
  backgroundPlaylistBytes: (await Promise.all(videos.map(fileBytes))).reduce((sum, bytes) => sum + bytes, 0),
  homeStylesheetRequests: [...html.matchAll(/<link\s+[^>]*rel="stylesheet"/g)].length,
  homeBlockingScriptRequests: [...html.matchAll(/<script\s+[^>]*src="[^"]+"[^>]*>/g)]
    .filter(([tag]) => !/(?:\sdefer(?:\s|>)|\sasync(?:\s|>)|type="module")/.test(tag)).length,
};

const failures = [];
for (const [metric, limit] of Object.entries(budgets)) {
  if (!(metric in metrics)) failures.push(`Unknown performance budget: ${metric}`);
  else if (metrics[metric] > limit) failures.push(`${metric}: ${metrics[metric]} exceeds ${limit}`);
}

if (!html.includes('preload="none"') || /<video[^>]+(?:src=|<source)/s.test(html)) {
  failures.push("Background video must remain source-free with preload=none in initial HTML");
}
if (/__asgBgVideoPreloader|preloadNextBackgroundVideo/.test(appSource)) {
  failures.push("Background playlist must not eagerly preload the next video");
}
for (const page of ["bans", "cars", "community", "driver", "fun-stats", "news", "races"]) {
  const routePattern = new RegExp(`(?:^|\\n)\\s*(?:"${page}"|${page}): \\[`);
  if (!routePattern.test(featureLoaderSource)) failures.push(`Missing route split for ${page}`);
}

console.log("Performance budgets:");
for (const [metric, value] of Object.entries(metrics)) console.log(`  ${metric}: ${value} / ${budgets[metric]}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Performance budget check passed.");
}
