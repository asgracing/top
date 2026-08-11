import test from "node:test";
import assert from "node:assert/strict";

import {
  LogoUploadError,
  inspectLogoFile,
  normalizeAssetResponse,
  validateLogoFile
} from "../../src/pages/account/logo-upload-model.js";

const file = (overrides = {}) => ({ type: "image/png", size: 1024, ...overrides });

test("accepts only bounded PNG and JPEG files", () => {
  assert.deepEqual(validateLogoFile(file()), { mediaType: "image/png", byteSize: 1024 });
  assert.deepEqual(validateLogoFile(file({ type: "image/jpeg" })).mediaType, "image/jpeg");
  assert.throws(() => validateLogoFile(file({ type: "image/gif" })), /image_media_type_not_allowed/);
  assert.throws(() => validateLogoFile(file({ size: 204801 })), /image_too_large/);
  assert.throws(() => validateLogoFile(file({ size: 0 })), /image_empty/);
});

test("decodes square dimensions and closes the temporary bitmap", async () => {
  let closed = false;
  const result = await inspectLogoFile(file(), {
    decode: async () => ({ width: 512, height: 512, close() { closed = true; } })
  });
  assert.deepEqual(result, {
    mediaType: "image/png", byteSize: 1024, width: 512, height: 512, recommendedSizeMet: true
  });
  assert.equal(closed, true);
  await assert.rejects(() => inspectLogoFile(file(), { decode: async () => ({ width: 512, height: 256 }) }), LogoUploadError);
  await assert.rejects(() => inspectLogoFile(file(), { decode: async () => ({ width: 2048, height: 2048 }) }), /image_dimensions_too_large/);
});

test("normalizes asset queue responses without retaining raw receipt data", () => {
  const result = normalizeAssetResponse({ asset: {
    asset_id: "cta_123", status: "rejected",
    receipt: { signature: "secret", error: { code: "version_conflict", message: "raw backend text" } }
  } });
  assert.deepEqual(result, { id: "cta_123", status: "rejected", final: true, errorCode: "version_conflict" });
  assert.equal(JSON.stringify(result).includes("raw backend"), false);
  assert.throws(() => normalizeAssetResponse({ asset: { asset_id: "<bad>", status: "pending" } }), /invalid_asset_response/);
});
