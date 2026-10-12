import {basename,resolve} from 'node:path';
import {assertArchiveScratchPath} from './workspace-scratch.mjs';
export const root = resolve(import.meta.dirname, '..');
const defaultDist = resolve(root, 'dist');
export const dist = resolve(process.env.ASG_DIST_OUTPUT_DIR || defaultDist);
if(dist !== defaultDist)assertArchiveScratchPath(dist);
export const previous = resolve(dist, '../'+basename(dist)+'.previous');
export const rollbackArtifact = '../'+basename(previous);
