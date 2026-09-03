export const SPECIAL_EVENT_CAR_ASSETS = Object.freeze({
  32: "/assets/car-icons/32.png",
});

export function normalizeSingleModelRestriction(item, fallback = null) {
  const itemCandidates = [
    item?.car_restriction,
    item?.rules?.car_model,
  ].filter(value => value && typeof value === "object");
  const fallbackCandidates = [
    fallback?.car_restriction,
    fallback?.rules?.car_model,
  ].filter(value => value && typeof value === "object");
  const candidates = itemCandidates.length ? itemCandidates : fallbackCandidates;
  const restriction = candidates.find(value => value && typeof value === "object" && value.mode === "single_model");
  if (!restriction) return null;

  const numericModelId = Number(restriction.car_model_id);
  const carModelId = Number.isInteger(numericModelId) ? numericModelId : null;
  const carModelName = String(restriction.car_model_name || "").trim()
    || (carModelId !== null ? `Car model ${carModelId}` : "");
  if (!carModelName) return null;

  return {
    mode: "single_model",
    car_model_id: carModelId,
    car_model_name: carModelName,
  };
}

export function isSpecialEvent(item, fallback = null) {
  return Boolean(normalizeSingleModelRestriction(item, fallback));
}

export function getSpecialEventPresentation(item, language = "ru", fallback = null) {
  const restriction = normalizeSingleModelRestriction(item, fallback);
  if (!restriction || !isSpecialEvent(item, fallback)) return null;

  const prefix = language === "en" ? "SINGLE-MODEL" : "МОНОМАШИНА";
  return {
    ...restriction,
    badge_label: `${prefix} · ${restriction.car_model_name}`,
    car_image_asset: restriction.car_model_id === null
      ? ""
      : SPECIAL_EVENT_CAR_ASSETS[restriction.car_model_id] || "",
  };
}
