import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {styleSnapshot,pageSnapshot,runtimeSnapshot,PRESENTATION_VERSION} from "./preview-presentation-policy.mjs";
const root=resolve(import.meta.dirname,"..");
const manifest=JSON.parse(await readFile(resolve(root,"preview/source-manifest.json"),"utf8"));
const sha=s=>createHash("sha256").update(s.replace(/\r\n/g,"\n")).digest("hex");
let changed=0;
for(const record of manifest.files){
  const filename=resolve(root,record.path.endsWith(".html")?`preview/${record.path}`:`preview/runtime/${record.path}`);
  const original=await readFile(filename,"utf8");
  if(sha(original)!==record.snapshotSha256)throw Error(`Frozen snapshot changed outside the generator: ${record.path}`);
  const source=record.path.endsWith(".html")?pageSnapshot(original):record.path.endsWith(".css")?styleSnapshot(original):runtimeSnapshot(record.path,original.replace(/\r\n/g,"\n"));
  if(source!==original){await writeFile(filename,source);changed++;}
  record.snapshotSha256=sha(source);
}
manifest.presentationVersion=PRESENTATION_VERSION;
manifest.presentationPolicy="Layered legacy styles; preview-only public view events. API snapshot and classic sources remain independent.";
await writeFile(resolve(root,"preview/source-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(`Preview presentation refreshed: ${changed} generated files; original source provenance preserved.`);
