// Build-time inputs. Public root/ru/old HTML must never be read as templates.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root = resolve(import.meta.dirname, '..');
export const v1SourceDirectory = resolve(root, 'v1-source/html');
export const v1SourceManifest = JSON.parse(await readFile(resolve(root, 'v1-source/manifest.json'), 'utf8'));
const templates = new Set(v1SourceManifest.templates);
if (v1SourceManifest.schemaVersion !== 1 || templates.size !== v1SourceManifest.templates.length) throw Error('Invalid V1 source manifest');
for (const path of templates) {
  if (!/^(?:[\w-]+\/)*[\w.-]+\.html$/.test(path) || /(^|\/)\.\.?($|\/)/.test(path)) throw Error('Invalid V1 template path: ' + path);
}
export async function readV1Html(path) {
  if (!templates.has(path)) throw Error('Undeclared maintained V1 template: ' + path);
  return (await readFile(resolve(v1SourceDirectory, path), 'utf8')).replace(/\r\n/g,'\n');
}
