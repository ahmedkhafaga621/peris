import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { formatAed } from "@peris/shared";
import { checkoutWhatsAppMessage, whatsappHref } from "@/data/site";
import { useCheckoutEyebrow } from "@/hooks/useCheckoutEyebrow";
import { useCheckoutPrefill } from "@/hooks/useCheckoutPrefill";
import { useConfirmationEyebrow } from "@/hooks/useConfirmationEyebrow";
import { useTellBoutique } from "@/hooks/useTellBoutique";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useSeo } from "@/lib/seo";
import { applyServerLines } from "@/store/syncCart";
import { useCart } from "@/store/useCart";
import { useSession } from "@/store/useSession";

type Quote = {
  subtotalFils: number;
  discountFils?: number;
  shippingFils: number;
  vatFils: number;
  totalFils: number;
  coupon?: {
    code: string;
    discountFils: number;
    freeShipping: boolean;
  } | null;
  shipping: {
    name: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
  methods?: Array<"cod" | "ziina">;
  cardMinimumFils?: number;
  paid: false;
};

export type PublicOrder = {
  number: string;
  email: string;
  status: string;
  statusLabel: string;
  trackingNumber: string | null;
  trackingUrl?: string | null;
  carrier: string | null;
  paymentStatus: string;
  paymentMethod: string;
  paymentId?: string | null;
  paid: boolean;
  subtotalFils: number;
  shippingFils: number;
  vatFils: number;
  totalFils: number;
  items: {
    name: string;
    color: string;
    size: string;
    lengthLabel: string | null;
    quantity: number;
    lineTotalFils: number;
  }[];
};

type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  line: string;
  isDefault: boolean;
};

export function CheckoutPage() {
  const checkoutEyebrow = useCheckoutEyebrow();
  const lines = useCart((state) => state.lines);
  const user = useSession((state) => state.user);
  const token = useSession((state) => state.accessToken);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [city, setCity] = useState("Dubai");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [note, setNote] = useState(
    params.get("cancelled") === "1"
      ? "Card checkout was cancelled. The bag is ready if you want to try again."
      : "",
  );
  const [pending, setPending] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [chosen, setChosen] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "ziina">("cod");
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  useSeo("Checkout — PERIS");

  const ziinaAvailable = quote?.methods?.includes("ziina") ?? false;
  const cardMinimumFils = quote?.cardMinimumFils ?? 200;
  const cardAllowed =
    ziinaAvailable && (quote?.totalFils ?? 0) >= cardMinimumFils;

  function refreshQuote() {
    if (lines.length === 0) return;
    void loadQuote(city, token).then((result) => {
      if (result.quote) {
        setQuote(result.quote);
        if (result.quote.coupon?.code) setCouponCode(result.quote.coupon.code);
      } else {
        setQuote(null);
        setNote(result.error ?? "Delivery could not be priced.");
      }
    });
  }

  useEffect(() => {
    if (!token) {
      setAddresses([]);
      setChosen("");
      return;
    }
    void fetch("/api/v1/account/addresses", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((body: { addresses?: SavedAddress[] }) => {
        const rows = body.addresses ?? [];
        setAddresses(rows);
        setChosen(
          (current) =>
            current ||
            rows.find((item) => item.isDefault)?.id ||
            rows[0]?.id ||
            "",
        );
      })
      .catch(() => setAddresses([]));
  }, [token]);

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void loadQuote(city, token).then((result) => {
        if (result.quote) {
          setQuote(result.quote);
          setNote((current) =>
            params.get("cancelled") === "1" && current
              ? current
              : "",
          );
          const minimum = result.quote.cardMinimumFils ?? 200;
          if (
            !result.quote.methods?.includes("ziina") ||
            result.quote.totalFils < minimum
          ) {
            setPaymentMethod("cod");
          }
        } else {
          setQuote(null);
          setNote(result.error ?? "Delivery could not be priced.");
        }
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [city, lines, token, params]);

  useEffect(() => {
    const row = addresses.find((item) => item.id === chosen);
    if (row) setCity(row.city);
  }, [addresses, chosen]);

  const picked = addresses.find((item) => item.id === chosen);

  if (lines.length === 0) {
    return (
      <div className="wrap" style={{ paddingBottom: 80, maxWidth: 720 }}>
        <header className="page-intro">
          <p className="eyebrow">{checkoutEyebrow}</p>
          <h1>The bag is empty</h1>
        </header>
        <Link to="/shop" className="btn btn-fill">
          View the edit
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingBottom: 80, maxWidth: 720 }}>
      <header className="page-intro">
        <p className="eyebrow">{checkoutEyebrow}</p>
        <h1>Delivery</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          {ziinaAvailable
            ? "Cash on delivery in Dubai, or card through Ziina. A success page never marks an order paid by itself."
            : "Cash on delivery in Dubai. The order is confirmed by the atelier system and stays unpaid until the courier collects. Card payment is not connected."}
        </p>
      </header>
      <form
        key={`${user?.id ?? "guest"}-${picked?.id ?? "manual"}`}
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setPending(true);
          setNote("");
          void placeOrder(
            {
              idempotencyKey: checkoutKey(),
              customerName: String(data.get("name") ?? ""),
              email: String(data.get("email") ?? ""),
              phone: String(data.get("phone") ?? ""),
              city: String(data.get("city") ?? ""),
              addressLine: String(data.get("address") ?? ""),
              paymentMethod,
            },
            token,
          )
            .then((placed) => {
              sessionStorage.removeItem("peris-checkout-key");
              applyServerLines([]);
              if (placed.checkoutUrl) {
                window.location.assign(placed.checkoutUrl);
                return;
              }
              navigate(
                `/checkout/confirmation?number=${encodeURIComponent(placed.order.number)}&email=${encodeURIComponent(placed.order.email)}`,
              );
            })
            .catch((error: unknown) => {
              setNote(
                error instanceof Error
                  ? error.message
                  : "The order was not created.",
              );
              setPending(false);
            });
        }}
      >
        <label className="field">
          <span>Full name</span>
          <input
            name="name"
            defaultValue={
              picked?.fullName ??
              (user ? `${user.firstName} ${user.lastName}` : "")
            }
            autoComplete="name"
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            name="phone"
            defaultValue={picked?.phone ?? ""}
            autoComplete="tel"
          />
        </label>
        {addresses.length > 0 ? (
          <label className="field">
            <span>Saved address</span>
            <select
              value={chosen}
              onChange={(event) => setChosen(event.target.value)}
            >
              <option value="">Type a new address</option>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.line}, {address.city}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>City</span>
          <input
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Address</span>
          <textarea name="address" defaultValue={picked?.line ?? ""} />
        </label>
        <div className="field">
          <span>Coupon</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              aria-label="Coupon code"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              disabled={Boolean(quote?.coupon)}
            />
            {quote?.coupon ? (
              <button
                type="button"
                className="btn btn-line"
                disabled={couponBusy}
                onClick={() => {
                  setCouponBusy(true);
                  setNote("");
                  void fetch("/api/v1/cart/coupon", {
                    method: "DELETE",
                    credentials: "include",
                    headers: jsonHeaders(token),
                  })
                    .then(async (response) => {
                      const body = (await response.json().catch(() => ({}))) as {
                        error?: string;
                      };
                      if (!response.ok) {
                        throw new Error(body.error ?? "The code was not removed.");
                      }
                      setCouponCode("");
                      refreshQuote();
                    })
                    .catch((error: unknown) =>
                      setNote(
                        error instanceof Error
                          ? error.message
                          : "The code was not removed.",
                      ),
                    )
                    .finally(() => setCouponBusy(false));
                }}
              >
                Remove code
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-line"
                disabled={couponBusy || !couponCode.trim()}
                onClick={() => {
                  setCouponBusy(true);
                  setNote("");
                  void fetch("/api/v1/cart/coupon", {
                    method: "POST",
                    credentials: "include",
                    headers: jsonHeaders(token),
                    body: JSON.stringify({ code: couponCode.trim() }),
                  })
                    .then(async (response) => {
                      const body = (await response.json().catch(() => ({}))) as {
                        error?: string;
                        coupon?: { code: string };
                      };
                      if (!response.ok) {
                        throw new Error(
                          body.error ?? "That code is not valid.",
                        );
                      }
                      if (body.coupon?.code) setCouponCode(body.coupon.code);
                      refreshQuote();
                    })
                    .catch((error: unknown) =>
                      setNote(
                        error instanceof Error
                          ? error.message
                          : "That code is not valid.",
                      ),
                    )
                    .finally(() => setCouponBusy(false));
                }}
              >
                Apply code
              </button>
            )}
          </div>
        </div>
        {ziinaAvailable ? (
          <fieldset className="field">
            <legend>Payment</legend>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />{" "}
              Cash on delivery
            </label>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "ziina"}
                disabled={!cardAllowed}
                onChange={() => setPaymentMethod("ziina")}
              />{" "}
              Card (Ziina)
            </label>
            {cardAllowed ? null : (
              <p>
                Card payments start at {formatAed(cardMinimumFils)}. This bag
                can be placed as cash on delivery.
              </p>
            )}
          </fieldset>
        ) : null}
        {quote ? (
          <div className="notice">
            <p>
              {quote.shipping.name}, {quote.shipping.estimatedMinDays}–
              {quote.shipping.estimatedMaxDays} days
            </p>
            <p>Pieces {formatAed(quote.subtotalFils)}</p>
            {quote.discountFils ? (
              <p>
                Code {quote.coupon?.code ?? ""} −
                {formatAed(quote.discountFils)}
              </p>
            ) : null}
            <p>Delivery {formatAed(quote.shippingFils)}</p>
            <p>Total {formatAed(quote.totalFils)}</p>
            <p>
              Includes VAT of {formatAed(quote.vatFils)}. Nothing is marked
              paid by this page.
            </p>
          </div>
        ) : null}
        {note ? <p className="notice">{note}</p> : null}
        <button
          type="submit"
          className="btn btn-fill"
          style={{ justifySelf: "start" }}
          disabled={pending || !quote}
        >
          {paymentMethod === "ziina"
            ? "Continue to card payment"
            : "Place cash on delivery order"}
        </button>
      </form>
    </div>
  );
}

export function ConfirmationPage() {
  const confirmationEyebrow = useConfirmationEyebrow();
  const [params] = useSearchParams();
  const number = params.get("number") ?? "";
  const email = params.get("email") ?? "";
  const paymentId = params.get("payment") ?? "";
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [note, setNote] = useState("");
  useSeo(number ? `${number} — PERIS` : "Order — PERIS");

  useEffect(() => {
    if (!number || !email) return;
    let cancelled = false;
    const load = () =>
      trackOrder(number, email)
        .then((result) => {
          if (!cancelled) setOrder(result);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setNote(
              error instanceof Error
                ? error.message
                : "The order could not be opened.",
            );
          }
        });
    void load();
    if (!paymentId) return () => {
      cancelled = true;
    };
    const handle = window.setInterval(() => {
      void fetch(`/api/v1/payments/${encodeURIComponent(paymentId)}/status`)
        .then((response) => response.json())
        .then((body: { payment?: { paid?: boolean } }) => {
          if (body.payment?.paid) void load();
        })
        .catch(() => undefined);
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [number, email, paymentId]);

  return (
    <div className="wrap" style={{ paddingBottom: 80, maxWidth: 720 }}>
      <header className="page-intro">
        <p className="eyebrow">{confirmationEyebrow}</p>
        <h1>{order ? order.number : "Confirmation"}</h1>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      {order ? <OrderReceipt order={order} /> : null}
    </div>
  );
}

export function OrderReceipt({ order }: { order: PublicOrder }) {
  const whatsapp = useWhatsApp();
  const checkoutPrefill = useCheckoutPrefill();
  const tellBoutique = useTellBoutique();
  const awaitingCard =
    order.paymentMethod === "ziina" &&
    !order.paid &&
    order.status === "AWAITING_PAYMENT";
  return (
    <div className="stack-form">
      <p className="notice">
        {order.status === "CANCELLED"
          ? order.paymentMethod === "ziina"
            ? "This card order was cancelled. The stock hold was released. No payment was taken."
            : "This order was cancelled. No payment was taken."
          : order.status === "REFUNDED"
            ? "The cash refund has been recorded. No card refund was sent."
            : order.paid
              ? "Payment has been recorded."
              : awaitingCard
                ? "Waiting for Ziina to confirm the card payment. This page does not mark the order paid."
                : "Cash on delivery. This order is confirmed and unpaid. No card payment was taken."}
      </p>
      <p>{order.statusLabel}</p>
      {order.trackingNumber ? (
        <p>
          {`Tracking ${order.trackingNumber}${order.carrier ? `, ${order.carrier}` : ""}`}
          {order.trackingUrl ? (
            <>
              {" · "}
              <a href={order.trackingUrl} rel="noreferrer" target="_blank">
                Open tracking
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      <ul>
        {order.items.map((item) => (
          <li key={`${item.name}-${item.size}-${item.lengthLabel}`}>
            {item.name}, {item.color}, {item.size}
            {item.lengthLabel ? `, ${item.lengthLabel}` : ""} × {item.quantity}{" "}
            — {formatAed(item.lineTotalFils)}
          </li>
        ))}
      </ul>
      <p>Delivery {formatAed(order.shippingFils)}</p>
      <p>
        Total {formatAed(order.totalFils)}, including VAT of{" "}
        {formatAed(order.vatFils)}
      </p>
      <a
        className="btn btn-line"
        style={{ justifySelf: "start" }}
        href={whatsappHref(
          checkoutWhatsAppMessage(checkoutPrefill, order.number),
          whatsapp,
        )}
      >
        {tellBoutique}
      </a>
    </div>
  );
}

export async function trackOrder(number: string, email: string) {
  const response = await fetch(
    `/api/v1/orders/track?number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}`,
  );
  const body = (await response.json().catch(() => ({}))) as {
    order?: PublicOrder;
    error?: string;
  };
  if (!response.ok || !body.order)
    throw new Error(body.error ?? "The order could not be opened.");
  return body.order;
}

function checkoutKey() {
  const existing = sessionStorage.getItem("peris-checkout-key");
  if (existing) return existing;
  const key = crypto.randomUUID();
  sessionStorage.setItem("peris-checkout-key", key);
  return key;
}

async function loadQuote(city: string, token: string | null) {
  try {
    const response = await fetch("/api/v1/checkout/quote", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders(token),
      body: JSON.stringify({ city }),
    });
    const body = (await response.json().catch(() => ({}))) as Quote & {
      error?: string;
    };
    if (!response.ok)
      return { error: body.error ?? "Delivery could not be priced." };
    return { quote: body };
  } catch {
    return { error: "The atelier system is not reachable." };
  }
}

async function placeOrder(
  input: Record<string, string>,
  token: string | null,
) {
  const response = await fetch("/api/v1/checkout", {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(token),
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => ({}))) as {
    order?: PublicOrder;
    paymentId?: string | null;
    checkoutUrl?: string | null;
    error?: string;
  };
  if (!response.ok || !body.order)
    throw new Error(body.error ?? "The order was not created.");
  if (body.order.paid) throw new Error("The order was recorded incorrectly.");
  return {
    order: body.order,
    paymentId: body.paymentId ?? null,
    checkoutUrl: body.checkoutUrl ?? null,
  };
}

function jsonHeaders(token: string | null) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}
