import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "../cart.js";
import type {
  CreatePaymentResult,
  PaymentProvider,
  VerifiedZiinaEvent,
} from "./types.js";

const ZIINA_API = "https://api-v2.ziina.com/api";

export function ziinaConfigured() {
  return Boolean(process.env.ZIINA_API_TOKEN?.trim());
}

function ziinaToken() {
  const token = process.env.ZIINA_API_TOKEN?.trim();
  if (!token) throw new HttpError(503, "Card payment is not connected.");
  return token;
}

function ziinaTestMode() {
  const raw = process.env.ZIINA_TEST?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  return true;
}

type ZiinaPaymentIntent = {
  id?: string;
  redirect_url?: string;
  status?: string;
};

export const ziinaProvider: PaymentProvider = {
  key: "ziina",
  async createPayment(input): Promise<CreatePaymentResult> {
    const successUrl = input.successUrl.includes("{PAYMENT_INTENT_ID}")
      ? input.successUrl
      : `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}ziina={PAYMENT_INTENT_ID}`;
    const response = await fetch(`${ZIINA_API}/payment_intent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ziinaToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountFils,
        currency_code: "AED",
        message: `PERIS order ${input.orderNumber}`,
        success_url: successUrl,
        cancel_url: input.cancelUrl,
        failure_url: input.cancelUrl,
        test: ziinaTestMode(),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as ZiinaPaymentIntent & {
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      const message =
        body.error || body.message || "Ziina did not create a payment.";
      throw new HttpError(response.status >= 500 ? 502 : 400, message);
    }
    if (!body.id || !body.redirect_url) {
      throw new HttpError(502, "Ziina did not return a checkout link.");
    }
    return {
      redirectUrl: body.redirect_url,
      status: "PENDING",
      providerRef: body.id,
    };
  },
};

export async function fetchZiinaPaymentIntent(intentId: string) {
  const response = await fetch(
    `${ZIINA_API}/payment_intent/${encodeURIComponent(intentId)}`,
    {
      headers: { Authorization: `Bearer ${ziinaToken()}` },
    },
  );
  const body = (await response.json().catch(() => ({}))) as ZiinaPaymentIntent & {
    error?: string;
  };
  if (!response.ok) {
    throw new HttpError(
      502,
      body.error || "Ziina payment status could not be read.",
    );
  }
  return body;
}

export function verifyZiinaWebhook(
  rawBody: Buffer,
  signature: string | undefined,
): VerifiedZiinaEvent {
  const secret = process.env.ZIINA_WEBHOOK_SECRET?.trim();
  if (!secret) throw new HttpError(503, "Ziina webhooks are not connected.");
  if (!signature) throw new HttpError(400, "Missing Ziina signature.");

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.trim().toLowerCase();
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    throw new HttpError(400, "Ziina signature was rejected.");
  }

  let parsed: {
    event?: string;
    data?: {
      id?: string;
      status?: string;
      operation_id?: string;
      amount?: number;
    };
  };
  try {
    parsed = JSON.parse(rawBody.toString("utf8")) as typeof parsed;
  } catch {
    throw new HttpError(400, "Ziina webhook body was not valid JSON.");
  }

  const intentId = parsed.data?.id?.trim() || "";
  const status = parsed.data?.status?.trim() || "";
  const event = parsed.event?.trim() || "";
  const operationId = parsed.data?.operation_id?.trim();
  const eventId =
    operationId ||
    (intentId && status ? `ziina:${intentId}:${status}` : "") ||
    `ziina:${expected.slice(0, 24)}`;

  const isStatusEvent = event === "payment_intent.status.updated";
  return {
    eventId,
    type: event,
    intentId,
    status,
    paid: isStatusEvent && status === "completed",
    failed:
      isStatusEvent && (status === "failed" || status === "canceled"),
    amountFils:
      typeof parsed.data?.amount === "number" ? parsed.data.amount : null,
  };
}
