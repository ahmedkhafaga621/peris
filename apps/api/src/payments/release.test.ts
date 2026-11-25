import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RESERVATION_MINUTES,
  reservationCutoff,
  reservationMinutes,
} from "./release.js";
import { createHmac } from "node:crypto";
import { verifyZiinaWebhook } from "./ziina.js";

test("reservation cutoff is thirty minutes by default", () => {
  const previous = process.env.RESERVATION_MINUTES;
  delete process.env.RESERVATION_MINUTES;
  try {
    assert.equal(reservationMinutes(), DEFAULT_RESERVATION_MINUTES);
    const now = new Date("2026-11-22T00:00:00.000Z");
    assert.equal(
      reservationCutoff(now).toISOString(),
      "2026-11-21T23:30:00.000Z",
    );
  } finally {
    if (previous == null) delete process.env.RESERVATION_MINUTES;
    else process.env.RESERVATION_MINUTES = previous;
  }
});

test("ziina webhook marks failed and canceled as failed outcomes", () => {
  const previous = process.env.ZIINA_WEBHOOK_SECRET;
  process.env.ZIINA_WEBHOOK_SECRET = "desk-secret";
  try {
    for (const status of ["failed", "canceled"] as const) {
      const body = Buffer.from(
        JSON.stringify({
          event: "payment_intent.status.updated",
          data: {
            id: "intent-1",
            status,
            operation_id: `op-${status}`,
            amount: 10000,
          },
        }),
        "utf8",
      );
      const signature = createHmac("sha256", "desk-secret")
        .update(body)
        .digest("hex");
      const verified = verifyZiinaWebhook(body, signature);
      assert.equal(verified.paid, false);
      assert.equal(verified.failed, true);
      assert.equal(verified.status, status);
    }
  } finally {
    if (previous == null) delete process.env.ZIINA_WEBHOOK_SECRET;
    else process.env.ZIINA_WEBHOOK_SECRET = previous;
  }
});
