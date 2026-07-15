import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const previous = resolve(root, "dist.previous");
const allowedRootFiles = new Set([
  "CNAME", "app.js", "apple-touch-icon.png", "favicon-16x16.png", "favicon-32x32.png",
  "favicon.ico", "index.html", "legal.css", "legal.js", "robots.txt", "sitemap.xml",
  "styles.css", "yandex_c76adf2164af15e6.html",
]);
const allowedDirectories = [
  "assets", "bans", "cars", "community", "cookies", "driver", "events", "fun-stats",
  "hourly", "media", "news", "news-content", "overlay", "privacy", "races", "social", "src", "styles",
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

const runtimeFiles = [...allowedRootFiles];
for (const directory of allowedDirectories) runtimeFiles.push(...await collectRuntimeFiles(resolve(root, directory), directory));
runtimeFiles.sort();

for (const path of runtimeFiles) {
  const target = resolve(dist, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await cp(resolve(root, path), target);
}

let revision = "unknown";
try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch {}
const metadata = {
  schemaVersion: 1,
  revision,
  builtAt: new Date().toISOString(),
  rollbackArtifact: "../dist.previous",
};
await writeFile(resolve(dist, "build-meta.json"), `${JSON.stringify(metadata, null, 2)}\n`);

const assets = [];
for (const path of runtimeFiles) {
  const content = await readFile(resolve(dist, path));
  assets.push({ path, bytes: content.byteLength, sha256: sha256(content) });
}
const manifest = { schemaVersion: 1, revision, files: assets.length, bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0), assets };
await writeFile(resolve(dist, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const checksumFiles = [...runtimeFiles, "asset-manifest.json", "build-meta.json"].sort();
const checksumLines = [];
for (const path of checksumFiles) checksumLines.push(`${sha256(await readFile(resolve(dist, path)))}  ${path}`);
await writeFile(resolve(dist, "checksums.sha256"), `${checksumLines.join("\n")}\n`);

const distBytes = (await Promise.all(checksumFiles.map(path => stat(resolve(dist, path))))).reduce((sum, item) => sum + item.size, 0);
console.log(`Built dist: ${checksumFiles.length + 1} files, ${distBytes} bytes, revision ${revision.slice(0, 12)}`);
