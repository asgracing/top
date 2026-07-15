import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const dist = resolve(root, "dist");
const toPosix = path => path.split(sep).join("/");
const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else files.push(toPosix(relative(dist, path)));
  }
  return files;
}

const manifest = JSON.parse(await readFile(resolve(dist, "asset-manifest.json"), "utf8"));
const metadata = JSON.parse(await readFile(resolve(dist, "build-meta.json"), "utf8"));
const checksumText = await readFile(resolve(dist, "checksums.sha256"), "utf8");
const checksumMap = new Map(checksumText.trim().split("\n").map(line => [line.slice(66), line.slice(0, 64)]));
const files = await collect(dist);
const failures = [];

for (const required of ["index.html", "app.js", "build-meta.json", "asset-manifest.json", "checksums.sha256", "src/entrypoints/home.js"]) {
  if (!files.includes(required)) failures.push(`Missing required dist file: ${required}`);
}
for (const path of files) {
  if (/(^|\/)(?:tests|scripts|stats_tool|donations-worker|community-likes-worker)(\/|$)/.test(path)) failures.push(`Forbidden directory in dist: ${path}`);
  if (/\.map$|\.md$|parser\.(?:log|json)$|background\.original/i.test(path)) failures.push(`Forbidden artifact in dist: ${path}`);
}
for (const asset of manifest.assets) {
  const content = await readFile(resolve(dist, asset.path));
  if (content.byteLength !== asset.bytes || sha256(content) !== asset.sha256) failures.push(`Manifest mismatch: ${asset.path}`);
}
for (const [path, checksum] of checksumMap) {
  if (sha256(await readFile(resolve(dist, path))) !== checksum) failures.push(`Checksum mismatch: ${path}`);
}
if (!metadata.revision || !metadata.builtAt || metadata.rollbackArtifact !== "../dist.previous") failures.push("Invalid build metadata");
if (manifest.files !== manifest.assets.length) failures.push("Invalid manifest file count");
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log(`Verified dist: ${files.length} files, ${manifest.bytes} runtime bytes, ${metadata.revision.slice(0, 12)}`);
