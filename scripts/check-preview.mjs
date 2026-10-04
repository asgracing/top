import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ROUTES } from "../preview/routes.js";
const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "preview/source-manifest.json"), "utf8"));
const sha = source => createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex");
const verifySources = process.argv.includes("--source");
if (manifest.hashFormat !== "utf8-lf") throw Error("Rebuild the preview with the current generator before publishing");
if (JSON.stringify(manifest.routes) !== JSON.stringify(ROUTES)) throw Error("Preview route map differs from the frozen snapshot");
for (const file of manifest.files) {
  if (verifySources && sha(await readFile(resolve(root, file.path), "utf8")) !== file.sha256) throw Error(`Preview snapshot needs rebuilding: ${file.path}. Run node scripts/build-preview.mjs`);
  const destination = file.path.endsWith('.html') ? `preview/${file.path}` : `preview/runtime/${file.path}`;
  const content = await readFile(resolve(root, destination), 'utf8');
  if (sha(content) !== file.snapshotSha256) throw Error(`Generated file edited directly: ${destination}`);
  if (destination.endsWith('.js')) execFileSync(process.execPath, ['--check', destination], {cwd:root,stdio:'pipe'});
  if (destination.endsWith('.html') && !content.includes('content="noindex,nofollow,noarchive"')) throw Error(`Preview index policy missing: ${destination}`);
}
for (const file of ['preview/app.js','preview/bootstrap.js','preview/routes.js','scripts/preview-presentation-policy.mjs','scripts/build-preview.mjs','scripts/refresh-preview-presentation.mjs',...(await readdir(resolve(root,'preview/components'))).filter(name=>name.endsWith('.js')).map(name=>`preview/components/${name}`)]) execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'pipe'});
const sitemap = await readFile(resolve(root,'sitemap.xml'),'utf8');
if (sitemap.includes('/preview/')) throw Error('Preview must not enter the production sitemap');
console.log(`Preview checked: ${ROUTES.length} routes, snapshot integrity, JavaScript syntax, indexing isolation${verifySources ? ", source consistency" : "; source tree deliberately independent"}.`);
