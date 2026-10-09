import {basename,isAbsolute,relative,resolve,sep} from 'node:path';
export const root = resolve(import.meta.dirname, '..');
const defaultDist = resolve(root, 'dist');
export const dist = resolve(process.env.ASG_DIST_OUTPUT_DIR || defaultDist);
// New checks use the current archive scratch area. Keep former output paths
// valid for existing release automation until its separate migration.
const temporaryRoots = [resolve(root, '../_archive/tmp'), resolve(root, '../tmp')];
const bounded = temporaryRoots.some(parent => {
  const child = relative(parent, dist);
  return child && !isAbsolute(child) && !child.startsWith('..'+sep) && child !== '..' && resolve(parent,child) === dist;
});
if (dist !== defaultDist && !bounded) {
  throw Error('Custom dist output must be inside a workspace scratch directory');
}
export const previous = resolve(dist, '../'+basename(dist)+'.previous');
export const rollbackArtifact = '../'+basename(previous);
