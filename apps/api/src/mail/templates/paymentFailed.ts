import type { MailMessage } from "../types.js";

export function paymentFailedMail(input: {
  to: string;
  customerName: string;
  number: string;
  reason: string;
}): MailMessage {
  return {
    to: input.to,
    subject: `PERIS order ${input.number} was not completed`,
    text: [
      `Dear ${input.customerName},`,
      "",
      `Your PERIS card order ${input.number} was not completed.`,
      input.reason,
      "No payment was taken. You may place the order again when you are ready.",
      "",
      "With care,",
      "PERIS",
    ].join("\n"),
  };
}
