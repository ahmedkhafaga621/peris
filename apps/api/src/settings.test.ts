import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultStoreSettings,
  normalizeStoredBoolean,
  normalizeStoredVatRate,
  normalizeStoreSettings,
} from "./settings.js";

test("merge saved settings over defaults without mutating the base object", () => {
  const result = normalizeStoreSettings({
    name: "PERIS",
    phone: "+971 50 540 6077",
    hours: "Daily from 10:00 AM to 10:00 PM.",
    vatRate: 0.05,
    shippingEnabled: true,
  });

  assert.equal(result.name, "PERIS");
  assert.equal(result.phone, "+971 50 540 6077");
  assert.equal(result.hours, "Daily from 10:00 AM to 10:00 PM.");
  assert.equal(result.vatRate, 0.05);
  assert.equal(result.shippingEnabled, true);
  assert.equal(defaultStoreSettings.name, "PERIS");
});

test("invalid values fall back to the safe defaults", () => {
  const result = normalizeStoreSettings({
    name: "",
    phone: "bad",
    whatsapp: "bad",
    instagram: "not-a-url",
    maps: "https://example.com",
    currency: "USD",
    vatRate: -1,
  });

  assert.equal(result.name, defaultStoreSettings.name);
  assert.equal(result.phone, defaultStoreSettings.phone);
  assert.equal(result.whatsapp, defaultStoreSettings.whatsapp);
  assert.equal(result.instagram, defaultStoreSettings.instagram);
  assert.equal(result.maps, defaultStoreSettings.maps);
  assert.equal(result.currency, defaultStoreSettings.currency);
  assert.equal(result.vatRate, defaultStoreSettings.vatRate);
});

test("VAT uses the current setting and remains compatible with legacy records", () => {
  assert.equal(normalizeStoredVatRate(0.08, { rate: 0.05 }), 0.08);
  assert.equal(normalizeStoredVatRate(undefined, { rate: 0.07 }), 0.07);
  assert.equal(normalizeStoredVatRate(0.8, { rate: 0.07 }), 0.05);
});

test("operational setting values preserve safe defaults for missing or invalid data", () => {
  assert.equal(normalizeStoredBoolean(false, true), false);
  assert.equal(normalizeStoredBoolean(undefined, true), true);
  assert.equal(normalizeStoredBoolean("false", true), true);
});
