import type { MailMessage } from "../types.js";

function formatAed(fils: number) {
  return `AED ${Math.round(fils / 100).toLocaleString("en-AE")}`;
}

export function orderConfirmedMail(input: {
  to: string;
  customerName: string;
  number: string;
  totalFils: number;
  paymentMethod: string;
}): MailMessage {
  const paymentNote =
    input.paymentMethod === "ziina"
      ? "Card payment has been recorded."
      : "Cash on delivery. Payment stays unpaid until the courier collects.";
  return {
    to: input.to,
    subject: `PERIS order ${input.number}`,
    text: [
      `Dear ${input.customerName},`,
      "",
      `Your PERIS order ${input.number} is confirmed.`,
      `Total ${formatAed(input.totalFils)}, including VAT.`,
      paymentNote,
      "",
      "With care,",
      "PERIS",
    ].join("\n"),
  };
}
