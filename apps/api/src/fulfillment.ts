import type { OrderStatus } from "@prisma/client";

export const fulfillmentLabel: Record<OrderStatus, string> = {
  PENDING: "Pending",
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  TAILORING: "In the workroom",
  READY_FOR_SHIPMENT: "Packed",
  SHIPPED: "Handed to the courier",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const nextFulfillment: Partial<Record<OrderStatus, OrderStatus[]>> = {
  CONFIRMED: ["PROCESSING", "TAILORING"],
  PROCESSING: ["TAILORING", "READY_FOR_SHIPMENT"],
  TAILORING: ["READY_FOR_SHIPMENT"],
  READY_FOR_SHIPMENT: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

export function nextSteps(status: OrderStatus) {
  return (nextFulfillment[status] ?? []).map((step) => ({ status: step, label: fulfillmentLabel[step] }));
}
