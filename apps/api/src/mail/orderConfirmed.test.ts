import test from "node:test";
import assert from "node:assert/strict";
import { orderConfirmedMail } from "./templates/orderConfirmed.js";

test("order confirmed mail includes the order number and COD note", () => {
  const mail = orderConfirmedMail({
    to: "guest@example.com",
    customerName: "Guest",
    number: "PR-10007",
    totalFils: 78500,
    paymentMethod: "cod",
  });
  assert.equal(mail.to, "guest@example.com");
  assert.match(mail.subject, /PR-10007/);
  assert.match(mail.text, /Cash on delivery/);
  assert.match(mail.text, /AED 785/);
});

test("order confirmed mail notes card payment for Ziina", () => {
  const mail = orderConfirmedMail({
    to: "guest@example.com",
    customerName: "Guest",
    number: "PR-10008",
    totalFils: 10000,
    paymentMethod: "ziina",
  });
  assert.match(mail.text, /Card payment has been recorded/);
});
