import test from "node:test";
import assert from "node:assert/strict";
import {
  getSpecialEventPresentation,
  isSpecialEvent,
  normalizeSingleModelRestriction,
} from "../../src/features/hourly/special-event.js";

const ferrariEvent = {
  event_type: "hourly",
  race_format: "hourly",
  car_restriction: {
    mode: "single_model",
    car_model_id: 32,
    car_model_name: "Ferrari 296 GT3",
  },
};

test("recognizes a regular Hourly event with a single-model restriction", () => {
  assert.equal(isSpecialEvent(ferrariEvent), true);
  assert.deepEqual(getSpecialEventPresentation(ferrariEvent, "ru"), {
    mode: "single_model",
    car_model_id: 32,
    car_model_name: "Ferrari 296 GT3",
    badge_label: "МОНОМАШИНА · Ferrari 296 GT3",
    car_image_asset: "/assets/car-icons/32.png",
  });
});

test("supports Hourly payloads containing the restriction under rules", () => {
  const compatible = {
    event_type: "hourly",
    rules: { car_model: ferrariEvent.car_restriction },
  };
  assert.equal(isSpecialEvent(compatible), true);
  assert.equal(getSpecialEventPresentation(compatible, "en").badge_label, "SINGLE-MODEL · Ferrari 296 GT3");
});

test("does not infer mono-machine styling from an event type", () => {
  const unrestrictedSpecial = { event_type: "special", car_restriction: { mode: "open" } };
  assert.equal(isSpecialEvent(unrestrictedSpecial), false);
  assert.equal(getSpecialEventPresentation(unrestrictedSpecial), null);
});

test("keeps unrestricted hourly events outside mono-machine styling", () => {
  const regular = { event_type: "hourly", car_restriction: { mode: "open" } };
  assert.equal(normalizeSingleModelRestriction(regular), null);
  assert.equal(normalizeSingleModelRestriction(regular, ferrariEvent), null);
  assert.equal(isSpecialEvent(regular), false);
  assert.equal(isSpecialEvent(regular, ferrariEvent), false);
  assert.equal(getSpecialEventPresentation(regular), null);
});
