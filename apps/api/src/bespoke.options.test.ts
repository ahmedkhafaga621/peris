import test from "node:test";
import assert from "node:assert/strict";
import { OWN_DESIGN, withOwnDesign } from "./bespoke.js";

test("withOwnDesign keeps catalog names and appends the own-design choice", () => {
  assert.deepEqual(withOwnDesign(["Noor Column Abaya", "Sahar Day Abaya"]), [
    "Noor Column Abaya",
    "Sahar Day Abaya",
    OWN_DESIGN,
  ]);
});

test("withOwnDesign does not duplicate the own-design choice", () => {
  assert.deepEqual(withOwnDesign(["My own design", "Layl Embroidery Abaya"]), [
    OWN_DESIGN,
    "Layl Embroidery Abaya",
  ]);
});
