import type { MailMessage } from "../types.js";

export function orderStatusMail(input: {
  to: string;
  customerName: string;
  number: string;
  statusLabel: string;
  note?: string;
}): MailMessage {
  return {
    to: input.to,
    subject: `PERIS order ${input.number} — ${input.statusLabel}`,
    text: [
      `Dear ${input.customerName},`,
      "",
      `Your PERIS order ${input.number} is now ${input.statusLabel.toLowerCase()}.`,
      input.note?.trim() || "",
      "",
      "With care,",
      "PERIS",
    ]
      .filter((line, index, lines) => line.length > 0 || index === 0 || lines[index - 1].length > 0)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n"),
  };
}
