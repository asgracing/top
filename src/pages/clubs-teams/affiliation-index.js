import { validateCurrentPointer } from "./catalog-model.js";
import { validateEntityDetail } from "./detail-model.js";

const DETAIL_PATH = /^details\/(clubs|teams)\/([a-z0-9][a-z0-9-]{0,127})\.json$/;
const OTHER_SNAPSHOT_PATH = /^(?:catalog\/(?:clubs|teams)\/page-[1-9][0-9]*\.json|ratings\/(?:general|hourly|championship|seasons\/[A-Za-z0-9][A-Za-z0-9_.-]{0,127})\/(?:clubs|teams)\/page-[1-9][0-9]*\.json|assets\/[0-9a-f]{64}\.(?:png|jpg))$/;

function completeManifest(manifest, pointer) {
  if (manifest?.schema_version !== 1 || manifest.kind !== "clubs_teams_public_snapshot"
      || manifest.rating_run_id !== pointer.rating_run_id || manifest.completed_at !== pointer.completed_at
      || manifest.content_sha256 !== pointer.content_sha256
      || (manifest.snapshot_id !== undefined && manifest.snapshot_id !== pointer.snapshot_id)
      || !Array.isArray(manifest.files) || manifest.files.length > 2048) return false;
  const seen = new Set();
  return manifest.files.every(file => {
    const path = file?.path;
    if (typeof path !== "string" || (!DETAIL_PATH.test(path) && !OTHER_SNAPSHOT_PATH.test(path))
        || seen.has(path) || !Number.isSafeInteger(file.bytes) || file.bytes < 0
        || typeof file.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(file.sha256)) return false;
    seen.add(path);
    return true;
  });
}

export function buildDriverAffiliationIndex(details) {
  const index = new Map();
  for (const detail of details) {
    if (!detail || !["club", "team"].includes(detail.entity_type)) continue;
    const entity = Object.freeze({ display_name: detail.display_name, slug: detail.slug });
    for (const member of detail.roster || []) {
      const publicId = String(member?.public_id || "").trim();
      if (!publicId) continue;
      index.set(publicId, Object.freeze({
        ...(index.get(publicId) || {}),
        [detail.entity_type]: entity
      }));
    }
  }
  return index;
}

// Share one verified index across profile/home consumers in this document.
// Every new call rechecks the public pointer; only immutable snapshot details
// are cached. A failed/partial read never turns into a permanent empty index.
export function createDriverAffiliationsLoader({ requestJson, dataBaseUrl }) {
  const base = `${dataBaseUrl.replace(/\/+$/, "")}/`;
  let inFlight = null;
  let cached = null;
  let generation = 0;

  function load() {
    if (inFlight) return inFlight;
    const startedGeneration = generation;
    const pending = Promise.resolve().then(async () => {
      const pointer = validateCurrentPointer(await requestJson(new URL("current.json", base), {
        retries: 1, cache: "no-store"
      }));
      const key = JSON.stringify([pointer.snapshot_id, pointer.rating_run_id, pointer.content_sha256]);
      if (startedGeneration !== generation) throw new Error("affiliation_snapshot_invalidated");
      if (cached?.key === key) return cached.value;
      const snapshotRoot = new URL(`snapshots/${pointer.snapshot_id}/`, base);
      const manifest = await requestJson(new URL("manifest.json", snapshotRoot), { retries: 1, cache: "no-store" });
      const files = Array.isArray(manifest?.files)
        ? manifest.files.map(file => String(file?.path || "").trim()).filter(path => DETAIL_PATH.test(path))
        : [];
      const loaded = await Promise.allSettled(files.map(async path => {
        const match = path.match(DETAIL_PATH);
        return validateEntityDetail(await requestJson(new URL(path, snapshotRoot), { retries: 1 }), {
          entityType: match[1] === "clubs" ? "club" : "team",
          slug: match[2], ratingRunId: pointer.rating_run_id
        });
      }));
      if (startedGeneration !== generation) throw new Error("affiliation_snapshot_invalidated");
      const details = loaded.filter(result => result.status === "fulfilled").map(result => result.value);
      const value = {
        affiliations: buildDriverAffiliationIndex(details),
        entities: new Map(details.map(detail => [detail.public_id, detail]))
      };
      if (completeManifest(manifest, pointer) && loaded.every(result => result.status === "fulfilled")) {
        cached = { key, value };
      }
      return value;
    }).finally(() => {
      if (inFlight === pending) inFlight = null;
    });
    inFlight = pending;
    return pending;
  }

  load.invalidate = () => {
    generation += 1;
    cached = null;
    inFlight = null;
  };
  return load;
}
