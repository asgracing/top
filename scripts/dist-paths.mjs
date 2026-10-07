import {basename,isAbsolute,relative,resolve,sep} from 'node:path';
export const root = resolve(import.meta.dirname, '..');
const defaultDist = resolve(root, 'dist');
export const dist = resolve(process.env.ASG_DIST_OUTPUT_DIR || defaultDist);
const temporaryRoot = resolve(root, '../tmp');
const temporaryRelative = relative(temporaryRoot, dist);
if (dist !== defaultDist && (!temporaryRelative || isAbsolute(temporaryRelative) || temporaryRelative.startsWith('..'+sep) || temporaryRelative === '..' || resolve(temporaryRoot,temporaryRelative) !== dist)) {
  throw Error('Custom dist output must be a child of the workspace tmp directory');
}
export const previous = resolve(dist, '../'+basename(dist)+'.previous');
export const rollbackArtifact = '../'+basename(previous);
