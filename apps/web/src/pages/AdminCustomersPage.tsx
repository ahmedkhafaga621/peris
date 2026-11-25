import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { formatAed } from "@peris/shared";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  orders: number;
  unpaid: number;
  createdAt: string;
};

export function AdminCustomersPage() {
  const user = useStaffSession((state) => state.user);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  useSeo("Customers — PERIS");

  useEffect(() => {
    if (!user) return;
    void loadCustomers(search)
      .then(setCustomers)
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "Customers could not be opened."));
  }, [user, search]);

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Customers</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Accounts that have signed in. A guest checkout stays on the order and is not listed here. This page does not change an account.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <form
        className="field"
        style={{ maxWidth: 420, marginBottom: 24 }}
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <label>
          <span>Find a customer</span>
          <input aria-label="Find a customer" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="submit" className="btn btn-line">
          Look up
        </button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Phone</th>
            <th>Account</th>
            <th>Orders</th>
            <th>Unpaid</th>
            <th>Opened</th>
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 ? (
            <tr>
              <td colSpan={6}>{search ? "No customer matches that search." : "No customer accounts are on the desk."}</td>
            </tr>
          ) : (
            customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <strong>
                    <Link to={`/admin/customers/${customer.id}`}>{customer.name}</Link>
                  </strong>
                  <p>{customer.email}</p>
                </td>
                <td>{customer.phone}</td>
                <td>{accountLabel[customer.status]}</td>
                <td>{customer.orders}</td>
                <td>{customer.unpaid}</td>
                <td>{formatWhen(customer.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}

function loadCustomers(search: string) {
  const path = search ? `/api/v1/admin/customers?q=${encodeURIComponent(search)}` : "/api/v1/admin/customers";
  return staffFetch<{ customers: CustomerRow[] }>(path).then((body) => body.customers);
}

const accountLabel = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  PENDING: "Pending",
} as const;

function measurementLine(row: CustomerDetail["measurements"][number]) {
  return [
    row.heightCm != null ? `Height ${row.heightCm} cm` : "",
    row.shoulderCm != null ? `Shoulder ${row.shoulderCm} cm` : "",
    row.sleeveCm != null ? `Sleeve ${row.sleeveCm} cm` : "",
    row.chestCm != null ? `Chest ${row.chestCm} cm` : "",
    row.waistCm != null ? `Waist ${row.waistCm} cm` : "",
    row.abayaLengthIn != null ? `Length ${row.abayaLengthIn} in` : "",
    row.notes ?? "",
  ]
    .filter((part) => part.length > 0)
    .join(", ");
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(iso));
}

type CustomerDetail = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  addresses: { id: string; line: string; city: string; phone: string; isDefault: boolean }[];
  measurements: {
    id: string;
    label: string;
    heightCm: number | null;
    shoulderCm: number | null;
    sleeveCm: number | null;
    chestCm: number | null;
    waistCm: number | null;
    abayaLengthIn: number | null;
    notes: string | null;
  }[];
  orders: { number: string; totalFils: number; payment: string; statusLabel: string; createdAt: string }[];
  requests: { number: string; statusLabel: string; amountFils: number | null }[];
  notes: { id: string; body: string; author: string; createdAt: string }[];
};

export function AdminCustomerPage() {
  const { id } = useParams();
  const user = useStaffSession((state) => state.user);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [problem, setProblem] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  useSeo("Customer — PERIS");

  useEffect(() => {
    if (!user || !id) return;
    void staffFetch<{ customer: CustomerDetail }>(`/api/v1/admin/customers/${encodeURIComponent(id)}`)
      .then((body) => setCustomer(body.customer))
      .catch((error: unknown) => setProblem(error instanceof Error ? error.message : "That customer could not be opened."));
  }, [user, id]);

  function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!id || draft.trim().length < 2) {
      setProblem("Write a short note.");
      return;
    }
    setSaving(true);
    setProblem("");
    void staffFetch<{ note: CustomerDetail["notes"][number] }>(`/api/v1/admin/customers/${encodeURIComponent(id)}/notes`, {
      method: "POST",
      body: JSON.stringify({ body: draft.trim() }),
    })
      .then((body) => {
        setCustomer((current) => (current ? { ...current, notes: [body.note, ...current.notes] } : current));
        setDraft("");
      })
      .catch((error: unknown) => setProblem(error instanceof Error ? error.message : "The note was not saved."))
      .finally(() => setSaving(false));
  }

  function setStatus(status: "ACTIVE" | "DISABLED") {
    if (!id) return;
    setSaving(true);
    setProblem("");
    void staffFetch<{ customer: { status: CustomerDetail["status"] } }>(`/api/v1/admin/customers/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    })
      .then((body) => {
        setCustomer((current) => (current ? { ...current, status: body.customer.status } : current));
      })
      .catch((error: unknown) => setProblem(error instanceof Error ? error.message : "The account was not changed."))
      .finally(() => setSaving(false));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Customer</p>
        <h1>{customer?.name ?? "Account"}</h1>
        {customer ? (
          <p className="lede" style={{ marginTop: 16 }}>
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ""}
            {` · ${accountLabel[customer.status]}`}
          </p>
        ) : null}
        {customer ? (
          <p className="lede" style={{ marginTop: 16 }}>
            A disabled account cannot sign in. Orders already placed stay on the desk.
          </p>
        ) : null}
        {customer && user?.permissions.includes("customers.write") ? (
          <button
            type="button"
            className="btn btn-line"
            style={{ marginTop: 16 }}
            disabled={saving}
            onClick={() => setStatus(customer.status === "ACTIVE" ? "DISABLED" : "ACTIVE")}
          >
            {customer.status === "ACTIVE" ? "Disable account" : "Enable account"}
          </button>
        ) : null}
        <p style={{ marginTop: 16 }}>
          <Link to="/admin/customers">All customers</Link>
        </p>
      </header>
      {problem ? <p className="notice">{problem}</p> : null}
      {customer ? (
        <>
          <h2>Notes</h2>
          <p className="lede">A note stays on this account. It is not sent to the customer.</p>
          {user?.permissions.includes("customers.write") ? (
            <form className="field" style={{ maxWidth: 520, marginBottom: 24 }} onSubmit={saveNote}>
              <label>
                <span>Note</span>
                <textarea aria-label="Customer note" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
              </label>
              <button type="submit" className="btn btn-line" disabled={saving}>
                Save note
              </button>
            </form>
          ) : null}
          {customer.notes.length === 0 ? (
            <p>No note is saved.</p>
          ) : (
            <ul>
              {customer.notes.map((entry) => (
                <li key={entry.id}>
                  {entry.body} {entry.author}, {formatWhen(entry.createdAt)}.
                </li>
              ))}
            </ul>
          )}
          <h2 style={{ marginTop: 48 }}>Orders</h2>
          {customer.orders.length === 0 ? (
            <p>No orders on this account.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Preparation</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.number}>
                    <td>
                      <strong>
                        <Link to={`/admin/orders/${order.number}`}>{order.number}</Link>
                      </strong>
                      <p>{formatWhen(order.createdAt)}</p>
                    </td>
                    <td>{formatAed(order.totalFils)}</td>
                    <td>{order.payment}</td>
                    <td>{order.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h2 style={{ marginTop: 48 }}>Addresses</h2>
          {customer.addresses.length === 0 ? (
            <p>No address is saved.</p>
          ) : (
            <ul>
              {customer.addresses.map((address) => (
                <li key={address.id}>
                  {address.line}, {address.city}. {address.phone}
                  {address.isDefault ? " Default." : ""}
                </li>
              ))}
            </ul>
          )}
          <h2 style={{ marginTop: 48 }}>Measurements</h2>
          <p className="lede">Saved by the customer. The desk does not change these.</p>
          {customer.measurements.length === 0 ? (
            <p>No measurements are saved.</p>
          ) : (
            <ul>
              {customer.measurements.map((row) => (
                <li key={row.id}>
                  {row.label}. {measurementLine(row)}
                </li>
              ))}
            </ul>
          )}
          <h2 style={{ marginTop: 48 }}>Atelier</h2>
          {customer.requests.length === 0 ? (
            <p>No atelier request on this account.</p>
          ) : (
            <ul>
              {customer.requests.map((request) => (
                <li key={request.number}>
                  {request.number}. {request.statusLabel}
                  {request.amountFils != null ? `. ${formatAed(request.amountFils)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </AdminChrome>
  );
}
