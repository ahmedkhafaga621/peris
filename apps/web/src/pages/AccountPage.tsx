import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ABAYA_LENGTHS, formatAed } from "@peris/shared";
import { useAccountEyebrow } from "@/hooks/useAccountEyebrow";
import { useSeo } from "@/lib/seo";
import { registerAccount, signIn, signOut, useSession } from "@/store/useSession";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

const registerSchema = signInSchema.extend({
  firstName: z.string().min(1, "Enter a first name"),
  lastName: z.string().min(1, "Enter a last name"),
});

export function AccountPage({ mode = "sign-in" }: { mode?: "sign-in" | "register" }) {
  const accountEyebrow = useAccountEyebrow();
  const user = useSession((state) => state.user);
  const ready = useSession((state) => state.ready);
  useSeo(user ? "Account — PERIS" : mode === "register" ? "Create an account — PERIS" : "Sign in — PERIS");

  if (!ready) {
    return (
      <div className="account-shell">
        <header className="account-hero">
          <div className="page-intro">
            <p className="eyebrow">{accountEyebrow}</p>
            <h1>Opening your account</h1>
          </div>
        </header>
      </div>
    );
  }

  if (user) return <SignedIn />;
  if (mode === "register") return <RegisterForm />;
  return <SignInForm />;
}

function SignedIn() {
  const accountEyebrow = useAccountEyebrow();
  const user = useSession((state) => state.user);
  const token = useSession((state) => state.accessToken);
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [orders, setOrders] = useState<{ number: string; paymentStatus: string; totalFils: number; paid: boolean }[]>([]);
  const [orderTick, setOrderTick] = useState(0);
  useEffect(() => {
    if (!token) return;
    void fetch("/api/v1/account/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((body: { orders?: { number: string; paymentStatus: string; totalFils: number; paid: boolean }[] }) => {
        setOrders(body.orders ?? []);
      })
      .catch(() => setOrders([]));
  }, [token, orderTick]);
  if (!user) return null;

  return (
    <div className="account-shell">
      <header className="account-hero">
        <div className="page-intro">
          <p className="eyebrow">{accountEyebrow}</p>
          <h1>{user.firstName}</h1>
          <p className="lede">{user.email}</p>
        </div>
        <button
          type="button"
          className="btn btn-line"
          onClick={() => {
            void signOut()
              .then(() => navigate("/account/login"))
              .catch(() => setNote("Sign-out did not finish. Try again."));
          }}
        >
          Sign out
        </button>
      </header>
      <p className="notice">
        A verification email is not sent yet. Signing out keeps the bag on the account and clears it on this device.
      </p>
      {note ? <p className="notice">{note}</p> : null}

      <section className="account-section">
        <div className="account-section-head">
          <h2>Orders</h2>
          <Link to="/shop" className="link-quiet">
            Continue shopping
          </Link>
        </div>
        {orders.length > 0 ? (
          <ul className="account-list">
            {orders.map((order) => (
              <li className="account-row" key={order.number}>
                <p>
                  <Link
                    to={`/checkout/confirmation?number=${encodeURIComponent(order.number)}&email=${encodeURIComponent(user.email)}`}
                  >
                    {order.number}
                  </Link>
                </p>
                <p className="account-row-meta">
                  {formatAed(order.totalFils)} · {order.paid ? "paid" : order.paymentStatus.toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice">No orders on this account yet.</p>
        )}
      </section>

      <AddressBook token={token} />
      <MeasurementBook token={token} />
      <AtelierRequests token={token} onOrder={() => setOrderTick((value) => value + 1)} />
    </div>
  );
}

function AtelierRequests({ token, onOrder }: { token: string | null; onOrder: () => void }) {
  const [rows, setRows] = useState<AtelierRequest[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState("");

  useEffect(() => {
    if (!token) return;
    void fetch("/api/v1/account/bespoke", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((body: { requests?: AtelierRequest[] }) => setRows(body.requests ?? []))
      .catch(() => setRows([]));
  }, [token]);

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Atelier</h2>
        <Link to="/bespoke" className="link-quiet">
          Commission a piece
        </Link>
      </div>
      <p className="notice">
        An accepted quote can be placed as cash on delivery to your saved Dubai address. The piece price is the quote.
        Delivery uses the Dubai rate already configured. Payment stays unpaid until collection is recorded. A declined
        quote is not placed as an order. A request sent with this email is kept on the account.
      </p>
      {rows.length === 0 ? (
        <p className="notice">No bespoke requests on this account yet.</p>
      ) : (
        <ul className="account-list">
          {rows.map((row) => (
            <li className="account-row" key={row.number}>
              <p>
                {row.number} — {row.design}, {row.color}, {row.statusLabel}.
                {row.quote ? ` ${formatAed(row.quote.amountFils)}. ${row.quote.message}` : " A price is not quoted yet."}
              </p>
              <div className="account-row-actions">
                {row.canAccept && token ? (
                  <button
                    type="button"
                    className="btn btn-fill"
                    aria-label={`Accept quote ${row.number}`}
                    disabled={pending === row.number}
                    onClick={() => {
                      setPending(row.number);
                      setNote("");
                      void fetch(`/api/v1/account/bespoke/${encodeURIComponent(row.number)}/accept`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then(async (response) => {
                          const body = (await response.json().catch(() => ({}))) as { error?: string };
                          if (!response.ok) throw new Error(body.error ?? "The quote was not accepted.");
                          return fetch("/api/v1/account/bespoke", { headers: { Authorization: `Bearer ${token}` } });
                        })
                        .then((response) => response.json())
                        .then((body: { requests?: AtelierRequest[] }) => setRows(body.requests ?? []))
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The quote was not accepted."))
                        .finally(() => setPending(""));
                    }}
                  >
                    Accept quote
                  </button>
                ) : null}
                {row.canDecline && token ? (
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Decline quote ${row.number}`}
                    disabled={pending === row.number}
                    onClick={() => {
                      setPending(row.number);
                      setNote("");
                      void fetch(`/api/v1/account/bespoke/${encodeURIComponent(row.number)}/decline`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then(async (response) => {
                          const body = (await response.json().catch(() => ({}))) as { error?: string };
                          if (!response.ok) throw new Error(body.error ?? "The quote was not declined.");
                          return fetch("/api/v1/account/bespoke", { headers: { Authorization: `Bearer ${token}` } });
                        })
                        .then((response) => response.json())
                        .then((body: { requests?: AtelierRequest[] }) => setRows(body.requests ?? []))
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The quote was not declined."))
                        .finally(() => setPending(""));
                    }}
                  >
                    Decline quote
                  </button>
                ) : null}
                {row.canConvert && token ? (
                  <button
                    type="button"
                    className="btn btn-fill"
                    aria-label={`Place cash order ${row.number}`}
                    disabled={pending === row.number}
                    onClick={() => {
                      setPending(row.number);
                      setNote("");
                      void fetch(`/api/v1/account/bespoke/${encodeURIComponent(row.number)}/order`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then(async (response) => {
                          const body = (await response.json().catch(() => ({}))) as { error?: string };
                          if (!response.ok) throw new Error(body.error ?? "The order was not placed.");
                          onOrder();
                          return fetch("/api/v1/account/bespoke", { headers: { Authorization: `Bearer ${token}` } });
                        })
                        .then((response) => response.json())
                        .then((body: { requests?: AtelierRequest[] }) => setRows(body.requests ?? []))
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The order was not placed."))
                        .finally(() => setPending(""));
                    }}
                  >
                    Place cash order
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {note ? <p className="notice">{note}</p> : null}
    </section>
  );
}

type AtelierRequest = {
  number: string;
  design: string;
  color: string;
  statusLabel: string;
  canAccept: boolean;
  canDecline: boolean;
  canConvert: boolean;
  quote: { amountFils: number; message: string } | null;
};

function MeasurementBook({ token }: { token: string | null }) {
  const [rows, setRows] = useState<SavedMeasurement[]>([]);
  const [lengths, setLengths] = useState<number[] | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    void loadMeasurements(token).then(setRows).catch(() => setRows([]));
  }, [token]);

  useEffect(() => {
    void fetch("/api/v1/lengths")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("lengths"))))
      .then((body: { lengths: number[] }) => {
        setLengths(body.lengths.length ? body.lengths : [...ABAYA_LENGTHS]);
      })
      .catch(() => setLengths([...ABAYA_LENGTHS]));
  }, []);

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Measurements</h2>
      </div>
      <p className="notice">Kept on this account. Send a bespoke request from the atelier page. A price is not quoted yet.</p>
      {rows.length === 0 ? <p className="notice">No saved measurements yet.</p> : null}
      <ul className="account-list">
        {rows.map((row) => (
          <li className="account-row" key={row.id}>
            <p>{row.label}</p>
            <p className="account-row-meta">{measurementLine(row)}</p>
            <div className="account-row-actions">
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  if (!token) return;
                  setNote("");
                  void fetch(`/api/v1/account/measurements/${encodeURIComponent(row.id)}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then((response) => {
                      if (!response.ok) throw new Error("The measurement was not removed.");
                      return loadMeasurements(token);
                    })
                    .then(setRows)
                    .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The measurement was not removed."));
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!token) return;
          const form = event.currentTarget;
          const data = new FormData(form);
          const body = measurementBody(data);
          if (!body) {
            setNote("Add a name and at least one measurement.");
            return;
          }
          setPending(true);
          setNote("");
          void fetch("/api/v1/account/measurements", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
            .then(async (response) => {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              if (!response.ok) throw new Error(payload.error ?? "The measurement was not saved.");
              form.reset();
              return loadMeasurements(token);
            })
            .then(setRows)
            .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The measurement was not saved."))
            .finally(() => setPending(false));
        }}
      >
        <label className="field">
          <span>Name</span>
          <input name="label" />
        </label>
        <label className="field">
          <span>Height, cm</span>
          <input name="heightCm" inputMode="decimal" />
        </label>
        <label className="field">
          <span>Shoulder, cm</span>
          <input name="shoulderCm" inputMode="decimal" />
        </label>
        <label className="field">
          <span>Sleeve, cm</span>
          <input name="sleeveCm" inputMode="decimal" />
        </label>
        <label className="field">
          <span>Chest, cm</span>
          <input name="chestCm" inputMode="decimal" />
        </label>
        <label className="field">
          <span>Waist, cm</span>
          <input name="waistCm" inputMode="decimal" />
        </label>
        <label className="field">
          <span>Abaya length</span>
          {lengths ? (
            <select name="abayaLengthIn" aria-label="Saved length" defaultValue="">
              <option value="">Not set</option>
              {lengths.map((length) => (
                <option key={length} value={length}>
                  {length} in
                </option>
              ))}
            </select>
          ) : (
            <p>Opening the lengths.</p>
          )}
        </label>
        <label className="field">
          <span>Notes</span>
          <input name="notes" />
        </label>
        {note ? <p className="notice">{note}</p> : null}
        <button type="submit" className="btn btn-fill" style={{ justifySelf: "start" }} disabled={pending}>
          Save measurements
        </button>
      </form>
    </section>
  );
}

type SavedMeasurement = {
  id: string;
  label: string;
  heightCm: number | null;
  shoulderCm: number | null;
  sleeveCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  abayaLengthIn: number | null;
  notes: string | null;
};

function measurementBody(data: FormData) {
  const label = String(data.get("label") ?? "").trim();
  const notes = String(data.get("notes") ?? "").trim();
  const heightCm = centimetre(data.get("heightCm"));
  const shoulderCm = centimetre(data.get("shoulderCm"));
  const sleeveCm = centimetre(data.get("sleeveCm"));
  const chestCm = centimetre(data.get("chestCm"));
  const waistCm = centimetre(data.get("waistCm"));
  const lengthValue = String(data.get("abayaLengthIn") ?? "");
  const abayaLengthIn = lengthValue ? Number(lengthValue) : undefined;
  if (label.length < 2) return null;
  if ([heightCm, shoulderCm, sleeveCm, chestCm, waistCm, abayaLengthIn].every((value) => value === undefined)) return null;
  return { label, notes: notes || undefined, heightCm, shoulderCm, sleeveCm, chestCm, waistCm, abayaLengthIn };
}

function centimetre(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function measurementLine(row: SavedMeasurement) {
  const parts = [
    row.heightCm != null ? `Height ${row.heightCm} cm` : "",
    row.shoulderCm != null ? `Shoulder ${row.shoulderCm} cm` : "",
    row.sleeveCm != null ? `Sleeve ${row.sleeveCm} cm` : "",
    row.chestCm != null ? `Chest ${row.chestCm} cm` : "",
    row.waistCm != null ? `Waist ${row.waistCm} cm` : "",
    row.abayaLengthIn != null ? `Length ${row.abayaLengthIn} in` : "",
    row.notes ?? "",
  ].filter(Boolean);
  return parts.join(", ");
}

function loadMeasurements(token: string) {
  return fetch("/api/v1/account/measurements", { headers: { Authorization: `Bearer ${token}` } })
    .then((response) => response.json())
    .then((body: { measurements?: SavedMeasurement[] }) => body.measurements ?? []);
}

function AddressBook({ token }: { token: string | null }) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    void loadAddresses(token).then(setAddresses).catch(() => setAddresses([]));
  }, [token]);

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Addresses</h2>
      </div>
      <p className="notice">Cash on delivery is only saved for Dubai.</p>
      {addresses.length === 0 ? <p className="notice">No saved address yet.</p> : null}
      <ul className="account-list">
        {addresses.map((address) => (
          <li className="account-row" key={address.id}>
            <p>
              {address.fullName}, {address.line}, {address.city}
            </p>
            <p className="account-row-meta">{address.phone}</p>
            <div className="account-row-actions">
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  if (!token) return;
                  setNote("");
                  void fetch(`/api/v1/account/addresses/${encodeURIComponent(address.id)}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then((response) => {
                      if (!response.ok) throw new Error("The address was not removed.");
                      return loadAddresses(token);
                    })
                    .then(setAddresses)
                    .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The address was not removed."));
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!token) return;
          const form = event.currentTarget;
          const data = new FormData(form);
          setPending(true);
          setNote("");
          void fetch("/api/v1/account/addresses", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: String(data.get("fullName") ?? ""),
              phone: String(data.get("phone") ?? ""),
              street: String(data.get("street") ?? ""),
              building: String(data.get("building") ?? ""),
              apartment: String(data.get("apartment") ?? ""),
            }),
          })
            .then(async (response) => {
              const body = (await response.json().catch(() => ({}))) as { error?: string };
              if (!response.ok) throw new Error(body.error ?? "The address was not saved.");
              form.reset();
              return loadAddresses(token);
            })
            .then(setAddresses)
            .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The address was not saved."))
            .finally(() => setPending(false));
        }}
      >
        <label className="field">
          <span>Full name</span>
          <input name="fullName" autoComplete="name" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" autoComplete="tel" />
        </label>
        <label className="field">
          <span>Street</span>
          <input name="street" autoComplete="street-address" />
        </label>
        <label className="field">
          <span>Building</span>
          <input name="building" />
        </label>
        <label className="field">
          <span>Apartment</span>
          <input name="apartment" />
        </label>
        {note ? <p className="notice">{note}</p> : null}
        <button type="submit" className="btn btn-fill" style={{ justifySelf: "start" }} disabled={pending}>
          Save address
        </button>
      </form>
    </section>
  );
}

type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  line: string;
  isDefault: boolean;
};

function loadAddresses(token: string) {
  return fetch("/api/v1/account/addresses", { headers: { Authorization: `Bearer ${token}` } })
    .then((response) => response.json())
    .then((body: { addresses?: SavedAddress[] }) => body.addresses ?? []);
}

function SignInForm() {
  const accountEyebrow = useAccountEyebrow();
  const form = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  return (
    <div className="account-auth">
      <header className="account-hero">
        <div className="page-intro">
          <p className="eyebrow">{accountEyebrow}</p>
          <h1>Sign in</h1>
          <p className="lede">Return to your orders, measurements, and atelier notes.</p>
        </div>
      </header>
      <div className="account-auth-panel">
        <form
          className="stack-form"
          onSubmit={form.handleSubmit(async (values) => {
            setNote("");
            try {
              await signIn(values.email, values.password);
              navigate("/account");
            } catch (error) {
              setNote(error instanceof Error ? error.message : "Sign in failed.");
            }
          })}
        >
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? <small className="field-error">{form.formState.errors.email.message}</small> : null}
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" {...form.register("password")} />
            {form.formState.errors.password ? <small className="field-error">{form.formState.errors.password.message}</small> : null}
          </label>
          {note ? <p className="notice">{note}</p> : null}
          <button type="submit" className="btn btn-fill" style={{ justifySelf: "start" }} disabled={form.formState.isSubmitting}>
            Continue
          </button>
        </form>
        <p className="notice" style={{ marginTop: 18 }}>
          New to the house? <Link to="/account/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

function RegisterForm() {
  const accountEyebrow = useAccountEyebrow();
  const form = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  return (
    <div className="account-auth">
      <header className="account-hero">
        <div className="page-intro">
          <p className="eyebrow">{accountEyebrow}</p>
          <h1>Create an account</h1>
          <p className="lede">Keep addresses, measurements, and orders in one place.</p>
        </div>
      </header>
      <div className="account-auth-panel">
      <form
        className="stack-form"
        onSubmit={form.handleSubmit(async (values) => {
          setNote("");
          try {
            await registerAccount(values);
            navigate("/account");
          } catch (error) {
            setNote(error instanceof Error ? error.message : "The account could not be created.");
          }
        })}
      >
        <label className="field">
          <span>First name</span>
          <input autoComplete="given-name" {...form.register("firstName")} />
          {form.formState.errors.firstName ? <small className="field-error">{form.formState.errors.firstName.message}</small> : null}
        </label>
        <label className="field">
          <span>Last name</span>
          <input autoComplete="family-name" {...form.register("lastName")} />
          {form.formState.errors.lastName ? <small className="field-error">{form.formState.errors.lastName.message}</small> : null}
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email ? <small className="field-error">{form.formState.errors.email.message}</small> : null}
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="new-password" {...form.register("password")} />
          {form.formState.errors.password ? <small className="field-error">{form.formState.errors.password.message}</small> : null}
        </label>
        {note ? <p className="notice">{note}</p> : null}
        <button type="submit" className="btn btn-fill" style={{ justifySelf: "start" }} disabled={form.formState.isSubmitting}>
          Create account
        </button>
      </form>
      <p className="notice" style={{ marginTop: 18 }}>
        Already registered? <Link to="/account/login">Sign in</Link>
      </p>
      </div>
    </div>
  );
}
