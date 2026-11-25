import { ConsoleMailer } from "./console.js";
import type { Mailer } from "./types.js";
import { bespokeQuoteMail } from "./templates/bespokeQuote.js";
import { orderConfirmedMail } from "./templates/orderConfirmed.js";
import { orderShippedMail } from "./templates/orderShipped.js";
import { orderStatusMail } from "./templates/orderStatus.js";
import { paymentFailedMail } from "./templates/paymentFailed.js";

let mailer: Mailer = new ConsoleMailer();

export function getMailer() {
  return mailer;
}

export function setMailer(next: Mailer) {
  mailer = next;
}

export async function sendOrderConfirmed(input: {
  to: string;
  customerName: string;
  number: string;
  totalFils: number;
  paymentMethod: string;
}) {
  await getMailer().send(orderConfirmedMail(input));
}

export async function sendOrderShipped(input: {
  to: string;
  customerName: string;
  number: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl?: string | null;
}) {
  await getMailer().send(orderShippedMail(input));
}

export async function sendPaymentFailed(input: {
  to: string;
  customerName: string;
  number: string;
  reason: string;
}) {
  await getMailer().send(paymentFailedMail(input));
}

export async function sendBespokeQuote(input: {
  to: string;
  customerName: string;
  number: string;
  amountFils: number;
  message: string;
}) {
  await getMailer().send(bespokeQuoteMail(input));
}

export async function sendOrderStatus(input: {
  to: string;
  customerName: string;
  number: string;
  statusLabel: string;
  note?: string;
}) {
  await getMailer().send(orderStatusMail(input));
}

export type { Mailer, MailMessage } from "./types.js";
