import test from "node:test";
import assert from "node:assert/strict";
import { listPaymentMethods } from "./index.js";

test("without Ziina token only cash on delivery is offered", () => {
  const previous = process.env.ZIINA_API_TOKEN;
  delete process.env.ZIINA_API_TOKEN;
  try {
    const methods = listPaymentMethods();
    assert.deepEqual(methods.methods, ["cod"]);
  } finally {
    if (previous == null) delete process.env.ZIINA_API_TOKEN;
    else process.env.ZIINA_API_TOKEN = previous;
  }
});
