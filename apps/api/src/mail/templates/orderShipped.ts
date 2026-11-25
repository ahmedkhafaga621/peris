import type { MailMessage } from "../types.js";

export function orderShippedMail(input: {
  to: string;
  customerName: string;
  number: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl?: string | null;
}): MailMessage {
  const lines = [
    `Dear ${input.customerName},`,
    "",
    `Your PERIS order ${input.number} is on its way.`,
    `Courier ${input.carrier}. Tracking ${input.trackingNumber}.`,
  ];
  if (input.trackingUrl) {
    lines.push(`Track the parcel: ${input.trackingUrl}`);
  }
  lines.push("", "With care,", "PERIS");
  return {
    to: input.to,
    subject: `PERIS order ${input.number} is on its way`,
    text: lines.join("\n"),
  };
}
