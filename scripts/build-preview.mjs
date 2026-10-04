// Reproducible snapshot of the existing behavior; only presentation/navigation
// is adapted. Never edit generated preview/runtime files by hand.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { ROUTES, previewHref } from "../preview/routes.js";

const root = resolve(import.meta.dirname, "..");
const origin = "https://asgracing.ru";
const directories = ["src", "styles", "hourly", "account", "teams", "clubs", "community", "events", "portal-ops", "moderation", "asg-lab"];
const files = new Set(["app.js", "styles.css", "legal.js", "legal.css", "news-read-state.js"]);
async function collect(path) {
  for (const entry of await readdir(resolve(root, path), { withFileTypes: true })) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) await collect(child);
    else if ([".js", ".css"].includes(extname(child))) files.add(child);
  }
}
for (const directory of directories) await collect(directory);
// The account's public overlay editor depends on this public model, not on
// any broadcast-computer installation or private overlay configuration.
files.add("overlay/driver/model.js");
const manifest = { schemaVersion: 1, source: "explicit snapshot of the local working tree; regular builds never regenerate it", sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), hashFormat: "utf8-lf", routes: ROUTES, files: [] };
const sha = source => createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex");
async function emit(path, source) {
  const destination = resolve(root, "preview", path);
  if (!destination.startsWith(resolve(root, "preview") + "/") && !destination.startsWith(resolve(root, "preview") + "\\")) throw Error("Invalid preview destination");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, source);
}
function assetUrl(href, owner) {
  if (/^(?:data:|blob:|#|https?:|\/\/)/i.test(href)) return href;
  return new URL(href, `${origin}/${owner}`).pathname.replaceAll('%7B', '{').replaceAll('%7D', '}');
}
for (const path of [...files].sort()) {
  const original = await readFile(resolve(root, path), "utf8");
  let source = original;
  if (path.endsWith(".css")) source = source.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (_, quote, href) => `url(${quote}${assetUrl(href, path)}${quote})`);
  if (path.endsWith(".js")) {
    source = source.replaceAll('? "/top"', '? ""').replaceAll(': "/top"', ': ""');
    // Keep language choices in this experiment from changing the classic UI.
    source = source.replaceAll('"asgLocale"', '"asgPreviewLocale"').replaceAll('"asgLang"', '"asgPreviewLang"')
      .replaceAll('"asg.top.v1:language"', '"asg.preview.v1:language"').replaceAll('"asgLocaleSuggestionDismissed"', '"asgPreviewLocaleSuggestionDismissed"');
    // Resolve runtime assets against their original location, not the snapshot.
    source = source.replace(/new URL\((["'`])((?:\.\.?\/)+(?:assets|social|news-content)\/[^"'`]+)\1,\s*import\.meta\.url\)/g,
      (_, quote, href) => `new URL(${quote}${assetUrl(href, path)}${quote}, import.meta.url)`);
  }
  if (path === "app.js") source = source.replace('function ensureTopGuide() {', 'function ensureTopGuide() { return; // The preview uses its own orientation and navigation.\n');
  if (path === "community/posts.js") source = source.replace(/\bsrc:\s*"([^"]+)"/g, (_, href) => `src: "${assetUrl(href, path)}"`);
  if (["app.js", "hourly/app.js", "hourly/championship/app.js"].includes(path)) {
    source = source.replace(/(modalSafetyLabel:\s*)"[^"]*"/g, '$1"ACC SA"');
  }
  if (path === "src/runtime/page-context.js") source = source.replace('siteBasePath: normalizedPage === "home" ? "./" : "../"', 'siteBasePath: "/"').replace('siteBasePath: pathname.slice(0, markerIndex + 1) || "/"', 'siteBasePath: "/"');
  if (path === "src/shared/localized-page.js") {
    source = 'import { PREFIX, classicPath, previewHref } from "../../../routes.js";\n' + source;
    source = source.replace('normalizedPathname(pathname)', 'normalizedPathname(classicPath(pathname))');
    source = source.replace('target.pathname = route[normalized];', 'target.pathname = `${PREFIX}${route[normalized]}`;');
    source = source.replace('return target.href;', 'return previewHref(target.href, locationRef.href);');
    source = source.replace('a[href]:not(.lang-btn)', 'a[href]:not(.lang-btn):not([data-preview-classic])');
    // Alternate-language links are generated in the preview HTML itself.
  }
  await emit(`runtime/${path}`, source);
  manifest.files.push({ path, sha256: sha(original), snapshotSha256: sha(source) });
}
for (const route of ROUTES) {
  const path = route.endsWith("/") ? `${route.slice(1)}index.html` : route.slice(1);
  const original = await readFile(resolve(root, path), "utf8");
  let source = original.replace(/<meta\b[^>]*name="robots"[^>]*>/gi, '<meta name="robots" content="noindex,nofollow,noarchive">');
  if (!/name="robots"/i.test(source)) source = source.replace("</head>", '<meta name="robots" content="noindex,nofollow,noarchive">\n</head>');
  source = source.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/gi, "");
  source = source.replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "");
  source = source.replace(/(<[^>]+?\b(?:href|src|poster|data-bg-options)=")([^"]+)(")/g, (match, before, href, after) => {
    if (/^(?:#|mailto:|tel:|data:|javascript:|acc-connect:|steam:)/i.test(href)) return match;
    if (before.endsWith('data-bg-options="')) return before + href.split("|").map(value => assetUrl(value, path)).join("|") + after;
    const url = new URL(href, `${origin}${route}`);
    if (url.origin !== origin) return match;
    const resourcePath = url.pathname.slice(1);
    if (files.has(resourcePath)) url.pathname = `/preview/runtime/${resourcePath}`;
    else if (/\bhref="$/.test(before)) url.href = previewHref(url.href, origin);
    return before + url.pathname + url.search + url.hash + after;
  });
  source = source.replace(/<title>([\s\S]*?)<\/title>/i, '<title>$1 · Preview</title>');
  source = source.replace(/<html\b/, '<html data-preview="true"');
  source = source.replace(/<body\b/, `<body data-preview-route="${route}"`);
  source = source.replace(/((?:from\s+|import\s*\()\s*["'])\/([^"']+)(["'])/g, (match, before, href, after) => {
    const file = href.split('?')[0];
    return files.has(file) ? `${before}/preview/runtime/${href}${after}` : match;
  });
  source = source.replace("</head>", '<link rel="stylesheet" href="/preview/design.css?v=20261004p1">\n<script type="module" src="/preview/app.js?v=20261004p1"></script>\n</head>');
  await emit(path, source);
  manifest.files.push({ path, sha256: sha(original), snapshotSha256: sha(source) });
}
await emit("source-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Preview generated: ${ROUTES.length} routes, ${files.size} isolated runtime files. Classic source files unchanged.`);
