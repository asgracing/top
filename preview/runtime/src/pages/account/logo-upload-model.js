const MAX_LOGO_BYTES = 200 * 1024;
const MAX_LOGO_DIMENSION = 1024;
const MEDIA_TYPES = new Set(["image/png", "image/jpeg"]);
const ASSET_STATUSES = new Set(["pending", "leased", "applied", "rejected", "expired", "dead_letter"]);

export class LogoUploadError extends Error {
  constructor(code) {
    super(code);
    this.name = "LogoUploadError";
    this.code = code;
  }
}

export function canUploadEntityLogo(entity, mutationReady) {
  if (!mutationReady || !entity || entity.status !== "approved" || entity.pendingRevision) return false;
  return entity.role === (entity.type === "club" ? "head" : entity.type === "team" ? "captain" : "");
}

export function validateLogoFile(file) {
  if (!file || typeof file !== "object") throw new LogoUploadError("image_required");
  if (!MEDIA_TYPES.has(file.type)) throw new LogoUploadError("image_media_type_not_allowed");
  if (!Number.isSafeInteger(file.size) || file.size < 1) throw new LogoUploadError("image_empty");
  if (file.size > MAX_LOGO_BYTES) throw new LogoUploadError("image_too_large");
  return { mediaType: file.type, byteSize: file.size };
}

export async function inspectLogoFile(file, { decode = globalThis.createImageBitmap } = {}) {
  const basic = validateLogoFile(file);
  if (typeof decode !== "function") throw new LogoUploadError("image_preview_unavailable");
  let decoded;
  try {
    decoded = await decode(file);
    const width = Number(decoded?.width);
    const height = Number(decoded?.height);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
      throw new LogoUploadError("image_decode_failed");
    }
    if (width > MAX_LOGO_DIMENSION || height > MAX_LOGO_DIMENSION) {
      throw new LogoUploadError("image_dimensions_too_large");
    }
    if (width !== height) throw new LogoUploadError("image_not_square");
    return { ...basic, width, height, recommendedSizeMet: width >= 256 };
  } catch (error) {
    if (error instanceof LogoUploadError) throw error;
    throw new LogoUploadError("image_decode_failed");
  } finally {
    decoded?.close?.();
  }
}

function safeIdentifier(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length <= 160 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text) ? text : null;
}

export function normalizeAssetResponse(value) {
  const root = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const source = root.asset && typeof root.asset === "object" && !Array.isArray(root.asset) ? root.asset : {};
  const id = safeIdentifier(source.asset_id);
  const status = ASSET_STATUSES.has(source.status) ? source.status : null;
  if (!id || !status) throw new LogoUploadError("invalid_asset_response");
  const receipt = source.receipt && typeof source.receipt === "object" && !Array.isArray(source.receipt) ? source.receipt : null;
  const errorCode = typeof receipt?.error?.code === "string" && receipt.error.code.length <= 80
    ? receipt.error.code : null;
  return { id, status, final: ["applied", "rejected", "expired", "dead_letter"].includes(status), errorCode };
}
