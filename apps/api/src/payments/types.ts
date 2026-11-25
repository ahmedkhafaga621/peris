export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type CreatePaymentResult = {
  redirectUrl?: string;
  status: PaymentStatus;
  providerRef?: string;
};

export type VerifiedZiinaEvent = {
  eventId: string;
  type: string;
  intentId: string;
  status: string;
  paid: boolean;
  failed: boolean;
  amountFils: number | null;
};

export interface PaymentProvider {
  key: "ziina" | "telr" | "tabby" | "cod";
  createPayment(input: {
    paymentId: string;
    orderNumber: string;
    amountFils: number;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CreatePaymentResult>;
}
