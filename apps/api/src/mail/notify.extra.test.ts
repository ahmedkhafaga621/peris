import test from "node:test";
import assert from "node:assert/strict";
import { bespokeQuoteMail } from "./templates/bespokeQuote.js";
import { orderStatusMail } from "./templates/orderStatus.js";

test("bespoke quote mail includes the amount and atelier note", () => {
  const mail = bespokeQuoteMail({
    to: "guest@example.com",
    customerName: "Guest",
    number: "BR-10010",
    amountFils: 120000,
    message: "Silk blend with a quiet cuff.",
  });
  assert.match(mail.subject, /BR-10010/);
  assert.match(mail.text, /AED 1,200/);
  assert.match(mail.text, /quiet cuff/);
});

test("order status mail names the new step", () => {
  const mail = orderStatusMail({
    to: "guest@example.com",
    customerName: "Guest",
    number: "PR-10012",
    statusLabel: "Delivered",
  });
  assert.match(mail.subject, /Delivered/);
  assert.match(mail.text, /delivered/);
});
