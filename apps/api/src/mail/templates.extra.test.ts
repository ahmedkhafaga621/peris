import test from "node:test";
import assert from "node:assert/strict";
import { orderShippedMail } from "./templates/orderShipped.js";
import { paymentFailedMail } from "./templates/paymentFailed.js";

test("order shipped mail includes tracking details", () => {
  const mail = orderShippedMail({
    to: "guest@example.com",
    customerName: "Guest",
    number: "PR-10010",
    trackingNumber: "TRK-1",
    carrier: "Courier",
    trackingUrl: "https://example.com/track/TRK-1",
  });
  assert.match(mail.subject, /on its way/);
  assert.match(mail.text, /TRK-1/);
  assert.match(mail.text, /https:\/\/example.com\/track\/TRK-1/);
});

test("payment failed mail explains that no payment was taken", () => {
  const mail = paymentFailedMail({
    to: "guest@example.com",
    customerName: "Guest",
    number: "PR-10011",
    reason: "Card payment failed. The hold was released.",
  });
  assert.match(mail.subject, /not completed/);
  assert.match(mail.text, /No payment was taken/);
  assert.match(mail.text, /hold was released/);
});
