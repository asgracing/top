import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import {root,dist,previous,rollbackArtifact} from './dist-paths.mjs';

const allowedRootFiles = new Set([
  "404.html", "CNAME", "app.js", "apple-touch-icon.png", "favicon-16x16.png", "favicon-32x32.png",
  "favicon.ico", "index.html", "index.ru.html", "legal.css", "legal.js", "news-read-state.js", "robots.txt", "sitemap.xml",
  "styles.css", "yandex_c76adf2164af15e6.html",
]);
const allowedDirectories = [
  "about", "join", "account", "ads", "asg-lab", "assets", "bans", "cars", "clubs", "community", "cookies", "driver", "events", "fun-stats",
  "hourly", "media", "moderation", "news", "news-content", "overlay", "portal-ops", "preview", "privacy", "races", "ru", "social", "src", "styles", "teams", "v2",
];
const allowedExtensions = new Set([
  ".css", ".gif", ".html", ".ico", ".jpeg", ".jpg", ".js", ".json", ".mp4", ".png",
  ".svg", ".txt", ".webm", ".webp", ".xml",
]);
const excludedNames = new Set(["background.original-20260630.mp4"]);

const toPosix = path => path.split(sep).join("/");
const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");

async function collectRuntimeFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = resolve(directory, entry.name);
    const path = prefix ? `${toPosix(prefix)}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await collectRuntimeFiles(source, path));
    else if (allowedExtensions.has(extname(entry.name).toLowerCase()) && !excludedNames.has(entry.name)) files.push(path);
  }
  return files;
}

await rm(previous, { recursive: true, force: true });
try {
  await stat(dist);
  await cp(dist, previous, { recursive: true });
  await rm(dist, { recursive: true, force: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(dist, { recursive: true });

let runtimeFiles = [...allowedRootFiles];
if(process.env.ASG_ROOT_RELEASE==='1'&&process.env.ASG_SITE_LAYOUT!=='root')throw Error('Root release requires the root layout');
for (const directory of allowedDirectories.filter(path=>process.env.ASG_ROOT_RELEASE!=='1'||path!=='preview')) runtimeFiles.push(...await collectRuntimeFiles(resolve(root, directory), directory));
runtimeFiles.sort();

for (const path of runtimeFiles) {
  const target = resolve(dist, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await cp(resolve(root, path), target);
}
if(process.env.ASG_V2_OUTPUT_DIR){
 const compilation=resolve(process.env.ASG_V2_OUTPUT_DIR);
 if(compilation===root)throw Error('Isolated V2 compilation cannot be the public root');
 await cp(resolve(compilation,'v2'),resolve(dist,'v2'),{recursive:true});
}

if(process.env.ASG_SITE_LAYOUT==='root'){
  await import('./build-root-layout.mjs');
  if(process.env.ASG_ROOT_RELEASE==='1')await import(process.env.ASG_ROOT_FALLBACK==='1'?'./build-root-fallback.mjs':'./build-root-seo.mjs');
  runtimeFiles=(await collectRuntimeFiles(dist)).sort();
}

let revision = "unknown";
if(process.env.ASG_SOURCE_REVISION){if(!/^[a-f0-9]{40}$/.test(process.env.ASG_SOURCE_REVISION))throw Error('Invalid source revision');revision=process.env.ASG_SOURCE_REVISION;}
else try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch {}
let worktreeDirty = null;
if(process.env.ASG_SOURCE_REVISION)worktreeDirty=true;
else try { worktreeDirty = Boolean(execFileSync('git', ['status','--porcelain','--untracked-files=normal'], {cwd:root,encoding:'utf8'}).trim()); } catch {}
const metadata = {
  schemaVersion: 1,
  revision,
  builtAt: new Date().toISOString(),
  rollbackArtifact,
  worktreeDirty,
  siteLayout:process.env.ASG_ROOT_FALLBACK==='1'?'root-fallback':process.env.ASG_ROOT_RELEASE==='1'?'root-release-candidate':process.env.ASG_SITE_LAYOUT==='root'?'root-review':'parallel',
};

const assets = [];
for (const path of runtimeFiles) {
  const content = await readFile(resolve(dist, path));
  assets.push({ path, bytes: content.byteLength, sha256: sha256(content) });
}
const manifest = { schemaVersion: 1, revision, files: assets.length, bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0), assets };
metadata.sourceSnapshotSha256 = sha256(Buffer.from(JSON.stringify(assets)));
await writeFile(resolve(dist, "build-meta.json"), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(resolve(dist, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const checksumFiles = [...runtimeFiles, "asset-manifest.json", "build-meta.json"].sort();
const checksumLines = [];
for (const path of checksumFiles) checksumLines.push(`${sha256(await readFile(resolve(dist, path)))}  ${path}`);
await writeFile(resolve(dist, "checksums.sha256"), `${checksumLines.join("\n")}\n`);

const distBytes = (await Promise.all(checksumFiles.map(path => stat(resolve(dist, path))))).reduce((sum, item) => sum + item.size, 0);
console.log(`Built dist: ${checksumFiles.length + 1} files, ${distBytes} bytes, revision ${revision.slice(0, 12)}`);
