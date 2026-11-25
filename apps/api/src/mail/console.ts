import type { Mailer, MailMessage } from "./types.js";

export class ConsoleMailer implements Mailer {
  async send(message: MailMessage) {
    const from = process.env.MAIL_FROM?.trim() || "PERIS <hello@peris.ae>";
    console.info(
      [
        "[mail]",
        `from: ${from}`,
        `to: ${message.to}`,
        `subject: ${message.subject}`,
        message.text,
      ].join("\n"),
    );
  }
}
