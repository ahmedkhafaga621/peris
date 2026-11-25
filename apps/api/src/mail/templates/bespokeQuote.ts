import type { MailMessage } from "../types.js";

function formatAed(fils: number) {
  return `AED ${Math.round(fils / 100).toLocaleString("en-AE")}`;
}

export function bespokeQuoteMail(input: {
  to: string;
  customerName: string;
  number: string;
  amountFils: number;
  message: string;
}): MailMessage {
  return {
    to: input.to,
    subject: `PERIS quote for ${input.number}`,
    text: [
      `Dear ${input.customerName},`,
      "",
      `Your bespoke request ${input.number} has a quote of ${formatAed(input.amountFils)}, including VAT.`,
      input.message,
      "",
      "Sign in to your account to accept or decline the quote.",
      "",
      "With care,",
      "PERIS",
    ].join("\n"),
  };
}
