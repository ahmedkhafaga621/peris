import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { formatAed } from "@peris/shared";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useSeo } from "@/lib/seo";
import {
  bootstrapStaff,
  staffFetch,
  staffSignIn,
  staffSignOut,
  useStaffSession,
} from "@/store/useStaffSession";

type DeskRange = "today" | "7d" | "30d" | "month" | "last" | "custom";

const periodLabel: Record<DeskRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  last: "Last month",
  custom: "Custom",
};

const periodButton: Record<DeskRange, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  month: "This month",
  last: "Last month",
  custom: "Custom",
};

type Dashboard = {
  range: DeskRange;
  orders: number;
  unpaidCount: number;
  unpaidFils: number;
  collectedFils: number;
  lowStock: {
    sku: string;
    name: string;
    color: string;
    size: string;
    available: number;
  }[];
};

type DeskStep = { status: string; label: string };

type DeskOrder = {
  number: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  status: string;
  statusLabel: string;
  nextSteps: DeskStep[];
  paymentStatus: string;
  method: string;
  totalFils: number;
  createdAt: string;
  paid: boolean;
  canCancel: boolean;
  canRefund: boolean;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  items: { name: string; quantity: number }[];
};

export function AdminLoginPage() {
  const user = useStaffSession((state) => state.user);
  const ready = useStaffSession((state) => state.ready);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  useSeo("Staff entrance — PERIS");
  useEffect(() => {
    void bootstrapStaff();
  }, []);

  if (ready && user) return <Navigate to="/admin" replace />;

  return (
    <main className="admin-shell">
      <div className="wrap admin-login">
        <div className="admin-login-panel">
          <img src="/brand/peris-burgundy.png" alt="PÉRIS" />
          <header className="page-intro">
            <p className="eyebrow">Staff</p>
            <h1>The desk</h1>
            <p className="lede" style={{ marginTop: 16 }}>
              Customer accounts are not accepted here.
            </p>
          </header>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              setPending(true);
              setNote("");
              void staffSignIn(email, password)
                .catch((error: unknown) =>
                  setNote(
                    error instanceof Error
                      ? error.message
                      : "The staff entrance did not open.",
                  ),
                )
                .finally(() => setPending(false));
            }}
          >
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                autoComplete="username"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {note ? <p className="notice">{note}</p> : null}
            <button
              type="submit"
              className="btn btn-fill"
              style={{ justifySelf: "start" }}
              disabled={pending}
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export function AdminDeskPage() {
  const user = useStaffSession((state) => state.user);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<DeskOrder[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DeskRange>("today");
  const [fromDate, setFromDate] = useState(dubaiInputDate);
  const [untilDate, setUntilDate] = useState(dubaiInputDate);
  const [note, setNote] = useState("");
  const [collecting, setCollecting] = useState("");
  const [cancelling, setCancelling] = useState("");
  const [refunding, setRefunding] = useState("");
  const [refundReason, setRefundReason] = useState<Record<string, string>>({});
  const [advancing, setAdvancing] = useState("");
  const [exporting, setExporting] = useState(false);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [trackingUrl, setTrackingUrl] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState<Record<string, string>>({});
  useSeo("Desk — PERIS");

  useEffect(() => {
    if (!user) return;
    if (
      range === "custom" &&
      (fromDate === "" || untilDate === "" || untilDate < fromDate)
    ) {
      setOrders([]);
      setDashboard((current) =>
        current
          ? {
              ...current,
              range,
              orders: 0,
              unpaidCount: 0,
              unpaidFils: 0,
              collectedFils: 0,
            }
          : current,
      );
      setNote(
        fromDate === "" || untilDate === ""
          ? "Choose a start date and an end date."
          : "The end date is before the start date.",
      );
      return;
    }
    setNote("");
    void loadDesk(range, fromDate, untilDate)
      .then(setDashboard)
      .catch((error: unknown) =>
        setNote(
          error instanceof Error ? error.message : "The desk could not open.",
        ),
      );
    void loadOrders(search, range, fromDate, untilDate)
      .then(setOrders)
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "Orders could not be opened.",
        ),
      );
  }, [user, search, range, fromDate, untilDate]);

  async function downloadOrders() {
    if (
      range === "custom" &&
      (fromDate === "" || untilDate === "" || untilDate < fromDate)
    ) {
      setNote(
        fromDate === "" || untilDate === ""
          ? "Choose a start date and an end date."
          : "The end date is before the start date.",
      );
      return;
    }
    const token = useStaffSession.getState().accessToken;
    const params = periodQuery(range, fromDate, untilDate);
    if (search) params.set("q", search);
    const path = `/api/v1/admin/orders/export?${params.toString()}`;
    setExporting(true);
    setNote("");
    try {
      const response = await fetch(path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "The orders could not be exported.");
      }
      const text = await response.text();
      const rows =
        text.split("\n").filter((line) => line.length > 0).length - 1;
      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "peris-orders.csv";
      link.click();
      URL.revokeObjectURL(url);
      setNote(
        `Exported ${Math.max(rows, 0)} orders. Amounts are in fils. 100 fils is AED 1.`,
      );
    } catch (error: unknown) {
      setNote(
        error instanceof Error
          ? error.message
          : "The orders could not be exported.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">
          {range === "custom"
            ? `${formatInputDate(fromDate)} – ${formatInputDate(untilDate)}`
            : periodLabel[range]}
        </p>
        <h1>Orders</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Orders placed in this period. Dubai time. Stock is the current count.
        </p>
        <div className="admin-period">
          {(Object.keys(periodButton) as DeskRange[]).map((key) => (
            <button
              key={key}
              type="button"
              className="btn btn-line"
              aria-pressed={range === key}
              onClick={() => setRange(key)}
            >
              {periodButton[key]}
            </button>
          ))}
        </div>
        {range === "custom" ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginTop: 16,
            }}
          >
            <label className="field">
              <span>From</span>
              <input
                type="date"
                aria-label="From date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Until</span>
              <input
                type="date"
                aria-label="Until date"
                value={untilDate}
                onChange={(event) => setUntilDate(event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </header>
      {dashboard ? (
        <div className="admin-metrics">
          <article>
            <p className="eyebrow">Awaiting collection</p>
            <p>{formatAed(dashboard.unpaidFils)}</p>
            <p>{dashboard.unpaidCount} unpaid</p>
          </article>
          <article>
            <p className="eyebrow">Collected</p>
            <p>{formatAed(dashboard.collectedFils)}</p>
            <p>Recorded by the desk</p>
          </article>
          <article>
            <p className="eyebrow">Orders</p>
            <p>{dashboard.orders}</p>
            <p>
              {dashboard.lowStock.length === 0
                ? "No piece is down to two or fewer."
                : `${dashboard.lowStock.length} pieces are low.`}
            </p>
          </article>
        </div>
      ) : null}
      {dashboard && dashboard.lowStock.length > 0 ? (
        <ul className="admin-stock">
          {dashboard.lowStock.map((item) => (
            <li key={item.sku}>
              <span>
                {item.name}, {item.color}, {item.size}
              </span>
              <span>{item.available} available</span>
            </li>
          ))}
        </ul>
      ) : null}
      {note ? <p className="notice">{note}</p> : null}
      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <label className="field">
          <span>Find an order</span>
          <input
            aria-label="Find an order"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-line">
          Look up
        </button>
        {user?.permissions.includes("reports.read") ? (
          <button
            type="button"
            className="btn btn-line"
            disabled={exporting}
            onClick={() => void downloadOrders()}
          >
            Download orders
          </button>
        ) : null}
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Preparation</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={5}>
                {search
                  ? "No order matches that search."
                  : "No orders were placed in this period."}
              </td>
            </tr>
          ) : null}
          {orders.map((order) => (
            <tr key={order.number}>
              <td>
                <strong>
                  <Link to={`/admin/orders/${order.number}`}>
                    {order.number}
                  </Link>
                </strong>
                <p>
                  {new Date(order.createdAt).toLocaleString("en-AE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p>
                  {order.items
                    .map((item) => `${item.name} × ${item.quantity}`)
                    .join(", ")}
                </p>
              </td>
              <td>
                <p>{order.customerName}</p>
                <p>{order.phone}</p>
                <p>{order.addressLine}</p>
              </td>
              <td>{formatAed(order.totalFils)}</td>
              <td>
                <p>
                  {order.status === "REFUNDED"
                    ? "Refunded"
                    : order.paid
                      ? "Paid"
                      : "Unpaid"}
                </p>
                <p>
                  {order.method === "cod" ? "Cash on delivery" : order.method}
                </p>
                {order.method === "cod" &&
                order.paymentStatus === "UNPAID" &&
                order.status !== "CANCELLED" ? (
                  <button
                    type="button"
                    className="btn btn-fill"
                    disabled={collecting === order.number}
                    onClick={() => {
                      setCollecting(order.number);
                      setNote("");
                      void staffFetch<{ order: DeskOrder }>(
                        `/api/v1/admin/orders/${encodeURIComponent(order.number)}/collect`,
                        { method: "POST" },
                      )
                        .then((body) => {
                          setOrders((current) =>
                            current.map((item) =>
                              item.number === body.order.number
                                ? body.order
                                : item,
                            ),
                          );
                          return loadDesk(range, fromDate, untilDate).then(
                            setDashboard,
                          );
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "Collection was not recorded.",
                          ),
                        )
                        .finally(() => setCollecting(""));
                    }}
                  >
                    Record collection
                  </button>
                ) : null}
                {order.canCancel ? (
                  <button
                    type="button"
                    className="btn btn-line"
                    disabled={cancelling === order.number}
                    onClick={() => {
                      setCancelling(order.number);
                      setNote("");
                      void staffFetch<{ order: DeskOrder }>(
                        `/api/v1/admin/orders/${encodeURIComponent(order.number)}/cancel`,
                        { method: "POST" },
                      )
                        .then((body) => {
                          setOrders((current) =>
                            current.map((item) =>
                              item.number === body.order.number
                                ? body.order
                                : item,
                            ),
                          );
                          return loadDesk(range, fromDate, untilDate).then(
                            setDashboard,
                          );
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The order was not cancelled.",
                          ),
                        )
                        .finally(() => setCancelling(""));
                    }}
                  >
                    Cancel order
                  </button>
                ) : null}
                {order.canRefund &&
                user?.permissions.includes("orders.refund") ? (
                  <>
                    <label className="field">
                      <span>Reason</span>
                      <input
                        aria-label={`Refund reason ${order.number}`}
                        value={refundReason[order.number] ?? ""}
                        onChange={(event) =>
                          setRefundReason((current) => ({
                            ...current,
                            [order.number]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-line"
                      disabled={refunding === order.number}
                      onClick={() => {
                        const reason = (
                          refundReason[order.number] ?? ""
                        ).trim();
                        if (reason.length < 2) {
                          setNote("Add a short reason for the refund.");
                          return;
                        }
                        setRefunding(order.number);
                        setNote("");
                        void staffFetch<{ order: DeskOrder }>(
                          `/api/v1/admin/orders/${encodeURIComponent(order.number)}/refund`,
                          {
                            method: "POST",
                            body: JSON.stringify({ reason }),
                          },
                        )
                          .then((body) => {
                            setOrders((current) =>
                              current.map((item) =>
                                item.number === body.order.number
                                  ? body.order
                                  : item,
                              ),
                            );
                            return loadDesk(range, fromDate, untilDate).then(
                              setDashboard,
                            );
                          })
                          .catch((error: unknown) =>
                            setNote(
                              error instanceof Error
                                ? error.message
                                : "The refund was not recorded.",
                            ),
                          )
                          .finally(() => setRefunding(""));
                      }}
                    >
                      Record refund
                    </button>
                  </>
                ) : null}
              </td>
              <td>
                <PreparationCell
                  order={order}
                  choice={
                    choice[order.number] ?? order.nextSteps[0]?.status ?? ""
                  }
                  tracking={tracking[order.number] ?? ""}
                  trackingUrl={trackingUrl[order.number] ?? ""}
                  carrier={carrier[order.number] ?? ""}
                  pending={advancing === order.number}
                  onChoice={(value) =>
                    setChoice((current) => ({
                      ...current,
                      [order.number]: value,
                    }))
                  }
                  onTracking={(value) =>
                    setTracking((current) => ({
                      ...current,
                      [order.number]: value,
                    }))
                  }
                  onTrackingUrl={(value) =>
                    setTrackingUrl((current) => ({
                      ...current,
                      [order.number]: value,
                    }))
                  }
                  onCarrier={(value) =>
                    setCarrier((current) => ({
                      ...current,
                      [order.number]: value,
                    }))
                  }
                  onAdvance={() => {
                    const status =
                      choice[order.number] ?? order.nextSteps[0]?.status;
                    if (!status) return;
                    setAdvancing(order.number);
                    setNote("");
                    void staffFetch<{ order: DeskOrder }>(
                      `/api/v1/admin/orders/${encodeURIComponent(order.number)}/status`,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          status,
                          trackingNumber: tracking[order.number] ?? "",
                          trackingUrl: trackingUrl[order.number] ?? "",
                          carrier: carrier[order.number] ?? "",
                        }),
                      },
                    )
                      .then((body) => {
                        setOrders((current) =>
                          current.map((item) =>
                            item.number === body.order.number
                              ? body.order
                              : item,
                          ),
                        );
                        setChoice((current) => ({
                          ...current,
                          [order.number]: body.order.nextSteps[0]?.status ?? "",
                        }));
                      })
                      .catch((error: unknown) =>
                        setNote(
                          error instanceof Error
                            ? error.message
                            : "The step was not saved.",
                        ),
                      )
                      .finally(() => setAdvancing(""));
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 ? (
        <p className="notice">
          {search
            ? "No order matches that search."
            : "No orders were placed in this period."}
        </p>
      ) : null}
    </AdminChrome>
  );
}

type StaffProductImage = {
  id: string;
  url: string;
  alt: string;
  position: string;
  sortOrder: number;
  colorId: string | null;
  colorName: string | null;
};

type StaffProductColor = {
  id: string;
  name: string;
  hex: string;
};

type StaffProduct = {
  id: string;
  name: string;
  slug: string;
  styleCode: string;
  imageUrl: string;
  hoverImageUrl: string;
  images: StaffProductImage[];
  colors: StaffProductColor[];
  alt: string;
  position: string;
  description: string;
  fabric: string;
  priceFils: number;
  compareAtFils: number | null;
  isPublished: boolean;
  isPlaceholder: boolean;
  isBestseller: boolean;
  isNew: boolean;
  collectionSlug: string;
  collectionName: string;
};

type DeskColor = {
  id: string;
  name: string;
  hex: string;
  isActive: boolean;
};

type DraftCreateImage = {
  key: string;
  url: string;
  colorName: string;
};

type PieceDraft = {
  price: string;
  published: boolean;
  compare: string;
  description: string;
  fabric: string;
  name: string;
  styleCode: string;
  alt: string;
  position: string;
};

function previousPrice(fils: number | null) {
  return fils ? String(fils / 100) : "";
}

function otherHouseCollection(slug: string) {
  if (slug === "casual-elegance")
    return { slug: "evening-occasions", name: "Evening & Occasions" };
  if (slug === "evening-occasions")
    return { slug: "casual-elegance", name: "Casual Elegance" };
  return null;
}

const emptyPieceForm = {
  name: "",
  styleCode: "",
  price: "",
  fabric: "",
  description: "",
  collectionSlug: "casual-elegance" as "casual-elegance" | "evening-occasions",
  images: [] as DraftCreateImage[],
  colorNames: ["Black"] as string[],
  alt: "",
  position: "center top" as "center top" | "center" | "center bottom",
  isPublished: false,
  isNew: true,
  isBestseller: false,
};

export function AdminProductsPage() {
  const user = useStaffSession((state) => state.user);
  const [products, setProducts] = useState<StaffProduct[]>([]);
  const [deskColors, setDeskColors] = useState<DeskColor[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PieceDraft>>({});
  const [saving, setSaving] = useState("");
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyPieceForm);
  const [extraColor, setExtraColor] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  useSeo("Pieces — PERIS");

  function rememberProducts(list: StaffProduct[]) {
    setProducts(list);
    setDrafts((current) => {
      const next = { ...current };
      for (const product of list) {
        if (!next[product.id]) {
          next[product.id] = {
            price: String(product.priceFils / 100),
            published: product.isPublished,
            compare: previousPrice(product.compareAtFils),
            description: product.description,
            fabric: product.fabric,
            name: product.name,
            styleCode: product.styleCode,
            alt: product.alt,
            position: product.position,
          };
        }
      }
      return next;
    });
  }

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ products: StaffProduct[] }>("/api/v1/admin/products")
      .then((body) => rememberProducts(body.products))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The pieces could not be opened.",
        ),
      );
    void staffFetch<{ colors: DeskColor[] }>("/api/v1/admin/colors")
      .then((body) => setDeskColors(body.colors.filter((color) => color.isActive)))
      .catch(() => setDeskColors([]));
  }, [user]);

  function patchProduct(product: StaffProduct) {
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? product : item)),
    );
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Catalog</p>
        <h1>Pieces</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A hidden piece leaves the shop. A piece kept close appears on the
          homepage. A new piece appears under New arrivals. Moving a piece
          changes its collection. A previous price shows beside the selling
          price when it sits above it. The description appears on the piece
          page. The fabric line appears on the piece page. The name appears on
          the piece page. The photograph line is read with the picture. The
          photograph place sets where the picture sits in the frame. The style
          code appears on the piece page. Prices already include 5% VAT.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <section className="admin-create">
        <h2>Add a piece</h2>
        <p className="lede">
          Choose one or more colors, then upload as many photographs as you need.
          Tag several photos with the same color — shoppers can scroll between
          them after picking that color. Shared photos (no color tag) appear when
          a color has no tagged photos. Stock is opened in every active size for
          each chosen color.
        </p>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            const name = createForm.name.trim();
            const styleCode = createForm.styleCode.trim();
            const description = createForm.description.trim();
            const fabric = createForm.fabric.trim();
            const alt = createForm.alt.trim();
            const price = Number(createForm.price.trim());
            if (name.length < 2) {
              setNote("Enter a name of at least 2 characters.");
              return;
            }
            if (!/^[A-Za-z0-9-]{2,40}$/.test(styleCode)) {
              setNote(
                "Use a style code with letters, numbers, and hyphens only (2–40 characters).",
              );
              return;
            }
            if (!Number.isInteger(price) || price < 1) {
              setNote("Enter the price in whole dirhams.");
              return;
            }
            if (fabric.length < 2) {
              setNote("Enter a fabric line of at least 2 characters.");
              return;
            }
            if (description.length < 8) {
              setNote("Write a description of at least 8 characters.");
              return;
            }
            if (!createForm.colorNames.length) {
              setNote("Choose at least one color.");
              return;
            }
            if (!createForm.images.length) {
              setNote("Upload at least one photograph.");
              return;
            }
            if (alt.length < 8) {
              setNote("Write a photograph line of at least 8 characters.");
              return;
            }
            setCreating(true);
            setNote("");
            void staffFetch<{ product: StaffProduct }>("/api/v1/admin/products", {
              method: "POST",
              body: JSON.stringify({
                name,
                styleCode,
                description,
                fabric,
                priceFils: price * 100,
                collectionSlug: createForm.collectionSlug,
                colorNames: createForm.colorNames,
                images: createForm.images.map((image, index) => ({
                  url: image.url,
                  alt: index === 0 ? alt : name,
                  position: index === 0 ? createForm.position : "center",
                  colorName: image.colorName || null,
                })),
                isPublished: createForm.isPublished,
                isNew: createForm.isNew,
                isBestseller: createForm.isBestseller,
              }),
            })
              .then((body) => {
                rememberProducts(
                  [...products, body.product].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  ),
                );
                setCreateForm(emptyPieceForm);
                setNote(`${body.product.name} is on the desk.`);
              })
              .catch((error: unknown) =>
                setNote(
                  error instanceof Error
                    ? error.message
                    : "The piece was not saved.",
                ),
              )
              .finally(() => setCreating(false));
          }}
        >
          <div className="admin-create-grid">
            <label className="field">
              <span>Name</span>
              <input
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Style code</span>
              <input
                value={createForm.styleCode}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    styleCode: event.target.value,
                  }))
                }
                pattern="[A-Za-z0-9-]{2,40}"
                title="Letters, numbers, and hyphens only"
                placeholder="e.g. PR-104"
                required
              />
            </label>
            <label className="field">
              <span>Price, AED</span>
              <input
                inputMode="numeric"
                value={createForm.price}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, price: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Fabric line</span>
              <input
                value={createForm.fabric}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, fabric: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Collection</span>
              <select
                value={createForm.collectionSlug}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    collectionSlug: event.target.value as typeof current.collectionSlug,
                  }))
                }
              >
                <option value="casual-elegance">Casual Elegance</option>
                <option value="evening-occasions">Evening & Occasions</option>
              </select>
            </label>
            <div className="field field-span">
              <span>Colors</span>
              <div className="choices" style={{ marginTop: 8 }}>
                {deskColors.map((color) => {
                  const checked = createForm.colorNames.includes(color.name);
                  return (
                    <label key={color.id} className="choice" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setCreateForm((current) => ({
                            ...current,
                            colorNames: checked
                              ? current.colorNames.filter((name) => name !== color.name)
                              : [...current.colorNames, color.name],
                          }))
                        }
                      />{" "}
                      <span className="swatch" style={{ background: color.hex, display: "inline-block", marginRight: 6 }} />
                      {color.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <label className="field field-span">
              <span>Description</span>
              <textarea
                rows={4}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                minLength={8}
                required
              />
            </label>
            <div className="field field-span">
              <span>Photographs</span>
              <p className="notice" style={{ border: 0, paddingTop: 4 }}>
                Add several photos for one color if you like — they become that
                color’s scrollable gallery on the piece page.
              </p>
              <div className="admin-create-grid" style={{ marginTop: 12 }}>
                {createForm.images.map((image) => (
                  <div key={image.key} className="field">
                    <img
                      src={image.url}
                      alt=""
                      className="image-upload__preview"
                    />
                    <label className="field">
                      <span>Color for this photo</span>
                      <select
                        value={image.colorName}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            images: current.images.map((row) =>
                              row.key === image.key
                                ? { ...row, colorName: event.target.value }
                                : row,
                            ),
                          }))
                        }
                      >
                        <option value="">All colors / shared</option>
                        {createForm.colorNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={() =>
                        setCreateForm((current) => ({
                          ...current,
                          images: current.images.filter((row) => row.key !== image.key),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <ImageUploadField
                  label="Add photograph"
                  kind="product"
                  value=""
                  onChange={(url) =>
                    setCreateForm((current) => ({
                      ...current,
                      images: [
                        ...current.images,
                        {
                          key: `${Date.now()}-${current.images.length}`,
                          url,
                          colorName: current.colorNames[0] ?? "",
                        },
                      ],
                    }))
                  }
                />
              </div>
            </div>
            <label className="field field-span">
              <span>Photograph line</span>
              <input
                value={createForm.alt}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, alt: event.target.value }))
                }
                minLength={8}
                placeholder="e.g. Black abaya, front view"
                required
              />
            </label>
            <label className="field">
              <span>First photograph place</span>
              <select
                value={createForm.position}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    position: event.target.value as typeof current.position,
                  }))
                }
              >
                <option value="center top">Center top</option>
                <option value="center">Center</option>
                <option value="center bottom">Center bottom</option>
              </select>
            </label>
            <div className="field" style={{ display: "grid", gap: 10, alignContent: "end" }}>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.isPublished}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                />{" "}
                Show in the shop
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.isNew}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      isNew: event.target.checked,
                    }))
                  }
                />{" "}
                New arrival
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.isBestseller}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      isBestseller: event.target.checked,
                    }))
                  }
                />{" "}
                Keep close
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-fill"
            style={{ justifySelf: "start", marginTop: 8 }}
            disabled={creating}
          >
            Save piece
          </button>
        </form>
      </section>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Piece</th>
            <th>Price, AED</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const draft = drafts[product.id] ?? {
              price: String(product.priceFils / 100),
              published: product.isPublished,
              compare: previousPrice(product.compareAtFils),
              description: product.description,
              fabric: product.fabric,
              name: product.name,
              styleCode: product.styleCode,
              alt: product.alt,
              position: product.position,
            };
            return (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <div className="admin-create-grid" style={{ marginTop: 12 }}>
                    {(product.images ?? []).map((image) => (
                      <div key={image.id} className="field">
                        <img src={image.url} alt="" className="image-upload__preview" />
                        <label className="field">
                          <span>Color for this photo</span>
                          <select
                            value={image.colorName ?? ""}
                            disabled={saving === `${product.id}:img:${image.id}`}
                            onChange={(event) => {
                              const colorName = event.target.value || null;
                              setSaving(`${product.id}:img:${image.id}`);
                              setNote("");
                              void staffFetch<{ product: StaffProduct }>(
                                `/api/v1/admin/products/${encodeURIComponent(product.id)}/image`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({
                                    url: image.url,
                                    imageId: image.id,
                                    colorName,
                                  }),
                                },
                              )
                                .then((body) => patchProduct(body.product))
                                .catch((error: unknown) =>
                                  setNote(
                                    error instanceof Error
                                      ? error.message
                                      : "The photograph was not updated.",
                                  ),
                                )
                                .finally(() => setSaving(""));
                            }}
                          >
                            <option value="">All colors / shared</option>
                            {(product.colors ?? []).map((color) => (
                              <option key={color.id} value={color.name}>
                                {color.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={saving === `${product.id}:del:${image.id}`}
                          onClick={() => {
                            setSaving(`${product.id}:del:${image.id}`);
                            setNote("");
                            void staffFetch<{ product: StaffProduct }>(
                              `/api/v1/admin/products/${encodeURIComponent(product.id)}/images/${encodeURIComponent(image.id)}`,
                              { method: "DELETE" },
                            )
                              .then((body) => patchProduct(body.product))
                              .catch((error: unknown) =>
                                setNote(
                                  error instanceof Error
                                    ? error.message
                                    : "The photograph was not removed.",
                                ),
                              )
                              .finally(() => setSaving(""));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <ImageUploadField
                      label="Add photograph"
                      kind="product"
                      value=""
                      onChange={(url) => {
                        setSaving(`${product.id}:add-image`);
                        setNote("");
                        void staffFetch<{ product: StaffProduct }>(
                          `/api/v1/admin/products/${encodeURIComponent(product.id)}/images`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              url,
                              colorName: product.colors[0]?.name ?? null,
                            }),
                          },
                        )
                          .then((body) => patchProduct(body.product))
                          .catch((error: unknown) =>
                            setNote(
                              error instanceof Error
                                ? error.message
                                : "The photograph was not saved.",
                            ),
                          )
                          .finally(() => setSaving(""));
                      }}
                    />
                  </div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <span>Colors on this piece</span>
                    <p>
                      {(product.colors ?? []).map((color) => color.name).join(", ") ||
                        "No color yet."}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                      <label className="field" style={{ minWidth: 180 }}>
                        <span>Add color</span>
                        <select
                          value={extraColor[product.id] ?? ""}
                          onChange={(event) =>
                            setExtraColor((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Choose a color</option>
                          {deskColors
                            .filter(
                              (color) =>
                                !(product.colors ?? []).some((row) => row.name === color.name),
                            )
                            .map((color) => (
                              <option key={color.id} value={color.name}>
                                {color.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="btn btn-line"
                        disabled={
                          !extraColor[product.id] || saving === `${product.id}:color`
                        }
                        onClick={() => {
                          const colorName = extraColor[product.id];
                          if (!colorName) return;
                          setSaving(`${product.id}:color`);
                          setNote("");
                          void staffFetch<{ product: StaffProduct }>(
                            `/api/v1/admin/products/${encodeURIComponent(product.id)}/colors`,
                            {
                              method: "POST",
                              body: JSON.stringify({ colorName }),
                            },
                          )
                            .then((body) => {
                              patchProduct(body.product);
                              setExtraColor((current) => ({ ...current, [product.id]: "" }));
                            })
                            .catch((error: unknown) =>
                              setNote(
                                error instanceof Error
                                  ? error.message
                                  : "The color was not added.",
                              ),
                            )
                            .finally(() => setSaving(""));
                        }}
                      >
                        Add color
                      </button>
                    </div>
                  </div>
                  <label className="field">
                    <span>Style code</span>
                    <input
                      aria-label={`Style code for ${product.slug}`}
                      value={draft.styleCode}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: {
                            ...draft,
                            styleCode: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the style code for ${product.slug}`}
                    disabled={saving === `${product.id}:style`}
                    onClick={() => {
                      const styleCode = draft.styleCode.trim();
                      if (!/^[A-Za-z0-9-]{2,40}$/.test(styleCode)) {
                        setNote("Use letters, numbers, and hyphens.");
                        return;
                      }
                      setSaving(`${product.id}:style`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/style`,
                        {
                          method: "POST",
                          body: JSON.stringify({ styleCode }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              ...(current[body.product.id] ?? draft),
                              styleCode: body.product.styleCode,
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The style code was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save style code
                  </button>
                  <label className="field">
                    <span>Name</span>
                    <input
                      aria-label={`Name for ${product.styleCode}`}
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: { ...draft, name: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the name for ${product.styleCode}`}
                    disabled={saving === `${product.id}:name`}
                    onClick={() => {
                      const name = draft.name.trim();
                      if (name.length < 2) {
                        setNote("Write the piece name.");
                        return;
                      }
                      setSaving(`${product.id}:name`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/name`,
                        {
                          method: "POST",
                          body: JSON.stringify({ name }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              ...(current[body.product.id] ?? draft),
                              name: body.product.name,
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The name was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save name
                  </button>
                  {product.isPlaceholder ? (
                    <p>Sample photograph and sample price.</p>
                  ) : null}
                  <label className="field">
                    <span>Photograph</span>
                    <textarea
                      aria-label={`Photograph line for ${product.styleCode}`}
                      value={draft.alt}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: { ...draft, alt: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the photograph line for ${product.styleCode}`}
                    disabled={saving === `${product.id}:alt`}
                    onClick={() => {
                      const alt = draft.alt.trim();
                      if (alt.length < 8) {
                        setNote(
                          "Write the photograph line in a full sentence.",
                        );
                        return;
                      }
                      setSaving(`${product.id}:alt`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/alt`,
                        {
                          method: "POST",
                          body: JSON.stringify({ alt }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              ...(current[body.product.id] ?? draft),
                              alt: body.product.alt,
                              position: body.product.position,
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The photograph line was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save photograph line
                  </button>
                  <label className="field">
                    <span>Place</span>
                    <select
                      aria-label={`Photograph place for ${product.slug}`}
                      value={draft.position}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: {
                            ...draft,
                            position: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="center top">Higher in the frame</option>
                      <option value="center">Centered</option>
                      <option value="center bottom">Lower in the frame</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the photograph place for ${product.slug}`}
                    disabled={saving === `${product.id}:place`}
                    onClick={() => {
                      const position = draft.position;
                      if (
                        position !== "center top" &&
                        position !== "center" &&
                        position !== "center bottom"
                      ) {
                        setNote("Choose where the photograph sits.");
                        return;
                      }
                      setSaving(`${product.id}:place`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/place`,
                        {
                          method: "POST",
                          body: JSON.stringify({ position }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              ...(current[body.product.id] ?? draft),
                              position: body.product.position,
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The photograph place was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save photograph place
                  </button>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      aria-label={`Description for ${product.name}`}
                      value={draft.description}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: {
                            ...draft,
                            description: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the description for ${product.name}`}
                    disabled={saving === `${product.id}:description`}
                    onClick={() => {
                      const description = draft.description.trim();
                      if (description.length < 8) {
                        setNote("Write the description in a full sentence.");
                        return;
                      }
                      setSaving(`${product.id}:description`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/description`,
                        {
                          method: "POST",
                          body: JSON.stringify({ description }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              ...(current[body.product.id] ?? draft),
                              description: body.product.description,
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The description was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save description
                  </button>
                  <label className="field">
                    <span>Fabric</span>
                    <input
                      aria-label={`Fabric for ${product.name}`}
                      value={draft.fabric}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: {
                            ...draft,
                            fabric: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the fabric for ${product.name}`}
                    disabled={saving === `${product.id}:fabric`}
                    onClick={() => {
                      const fabric = draft.fabric.trim();
                      if (fabric.length < 2) {
                        setNote("Write the fabric in a short line.");
                        return;
                      }
                      setSaving(`${product.id}:fabric`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/fabric`,
                        {
                          method: "POST",
                          body: JSON.stringify({ fabric }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              ...(current[body.product.id] ?? draft),
                              fabric: body.product.fabric,
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The fabric was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save fabric
                  </button>
                </td>
                <td>
                  <label className="field">
                    <span>Whole dirhams</span>
                    <input
                      inputMode="numeric"
                      value={draft.price}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: { ...draft, price: event.target.value },
                        }))
                      }
                    />
                  </label>
                </td>
                <td>
                  <label className="choice-label">
                    <input
                      type="checkbox"
                      checked={draft.published}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: {
                            ...draft,
                            published: event.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    On the shop
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    disabled={saving === product.id}
                    onClick={() => {
                      const amount = Number(draft.price);
                      if (!Number.isInteger(amount) || amount < 1) {
                        setNote("Enter the price in whole dirhams.");
                        return;
                      }
                      setSaving(product.id);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            priceFils: amount * 100,
                            isPublished: draft.published,
                          }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              price: String(body.product.priceFils / 100),
                              published: body.product.isPublished,
                              compare: previousPrice(
                                body.product.compareAtFils,
                              ),
                              description: body.product.description,
                              fabric: body.product.fabric,
                              name: body.product.name,
                              styleCode: body.product.styleCode,
                              alt: body.product.alt,
                              position: body.product.position,
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The piece was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save
                  </button>
                  <label className="field">
                    <span>Previous price</span>
                    <input
                      inputMode="numeric"
                      aria-label={`Previous price for ${product.name}`}
                      value={draft.compare}
                      placeholder="None"
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.id]: {
                            ...draft,
                            compare: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the previous price for ${product.name}`}
                    disabled={saving === `${product.id}:compare`}
                    onClick={() => {
                      const trimmed = draft.compare.trim();
                      const compareFils =
                        trimmed === "" ? null : Number(trimmed) * 100;
                      if (
                        compareFils !== null &&
                        (!Number.isInteger(Number(trimmed)) ||
                          Number(trimmed) < 1)
                      ) {
                        setNote("Enter the previous price in whole dirhams.");
                        return;
                      }
                      if (
                        compareFils !== null &&
                        compareFils <= product.priceFils
                      ) {
                        setNote(
                          "The previous price has to sit above the selling price.",
                        );
                        return;
                      }
                      setSaving(`${product.id}:compare`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/compare`,
                        {
                          method: "POST",
                          body: JSON.stringify({ compareFils }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                          setDrafts((current) => ({
                            ...current,
                            [body.product.id]: {
                              ...(current[body.product.id] ?? draft),
                              compare: previousPrice(
                                body.product.compareAtFils,
                              ),
                            },
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The previous price was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save previous price
                  </button>
                  <p>
                    {product.isBestseller ? "Kept close" : "Not in that edit"}
                  </p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={
                      product.isBestseller
                        ? `Remove ${product.name} from the close edit`
                        : `Keep ${product.name} close`
                    }
                    disabled={saving === `${product.id}:best`}
                    onClick={() => {
                      setSaving(`${product.id}:best`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/bestseller`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            isBestseller: !product.isBestseller,
                          }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The close edit was not changed.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    {product.isBestseller
                      ? "Remove from the close edit"
                      : "Keep close"}
                  </button>
                  <p>{product.isNew ? "New" : "Not new"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={
                      product.isNew
                        ? `Remove ${product.name} from new arrivals`
                        : `Mark ${product.name} as new`
                    }
                    disabled={saving === `${product.id}:new`}
                    onClick={() => {
                      setSaving(`${product.id}:new`);
                      setNote("");
                      void staffFetch<{ product: StaffProduct }>(
                        `/api/v1/admin/products/${encodeURIComponent(product.id)}/arrival`,
                        {
                          method: "POST",
                          body: JSON.stringify({ isNew: !product.isNew }),
                        },
                      )
                        .then((body) => {
                          setProducts((current) =>
                            current.map((item) =>
                              item.id === body.product.id ? body.product : item,
                            ),
                          );
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The new arrival was not changed.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    {product.isNew ? "Remove from new arrivals" : "Mark as new"}
                  </button>
                  {product.collectionName ? (
                    <p>{product.collectionName}</p>
                  ) : null}
                  {otherHouseCollection(product.collectionSlug) ? (
                    <button
                      type="button"
                      className="btn btn-line"
                      aria-label={`Move ${product.name} to ${otherHouseCollection(product.collectionSlug)?.name}`}
                      disabled={saving === `${product.id}:collection`}
                      onClick={() => {
                        const next = otherHouseCollection(
                          product.collectionSlug,
                        );
                        if (!next) return;
                        setSaving(`${product.id}:collection`);
                        setNote("");
                        void staffFetch<{ product: StaffProduct }>(
                          `/api/v1/admin/products/${encodeURIComponent(product.id)}/collection`,
                          {
                            method: "POST",
                            body: JSON.stringify({ slug: next.slug }),
                          },
                        )
                          .then((body) => {
                            setProducts((current) =>
                              current.map((item) =>
                                item.id === body.product.id
                                  ? body.product
                                  : item,
                              ),
                            );
                          })
                          .catch((error: unknown) =>
                            setNote(
                              error instanceof Error
                                ? error.message
                                : "The collection was not changed.",
                            ),
                          )
                          .finally(() => setSaving(""));
                      }}
                    >
                      Move to{" "}
                      {otherHouseCollection(product.collectionSlug)?.name}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminChrome>
  );
}

function adminCurrent(path: string, pathname: string, exact = true) {
  if (exact) return pathname === path ? ("page" as const) : undefined;
  return pathname.startsWith(path) ? ("page" as const) : undefined;
}

export function AdminChrome({ children }: { children: ReactNode }) {
  const user = useStaffSession((state) => state.user);
  const ready = useStaffSession((state) => state.ready);
  const location = useLocation();
  useEffect(() => {
    void bootstrapStaff();
  }, []);

  if (!ready) {
    return (
      <main className="admin-shell">
        <div className="wrap page-intro">
          <h1>Opening the desk</h1>
        </div>
      </main>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;

  const canWriteProducts = user.permissions.includes("products.write");
  const canWriteContent = user.permissions.includes("content.write");
  const canWriteMarketing = user.permissions.includes("marketing.write");
  const canWriteShipping = user.permissions.includes("shipping.write");
  const canWriteSettings = user.permissions.includes("settings.write");
  const canWriteCustomers = user.permissions.includes("customers.write");
  const canReadCustomers = user.permissions.includes("customers.read");
  const canModerateReviews = user.permissions.includes("reviews.moderate");
  const canReadAudit = user.permissions.includes("audit.read");
  const showHouse =
    canWriteContent || canWriteMarketing || canWriteSettings;
  const showPeople =
    canReadCustomers || canWriteCustomers || canModerateReviews || canReadAudit;

  return (
    <main className="admin-shell">
      <div className="wrap admin-frame">
        <header className="admin-top">
          <div className="admin-brand">
            <img src="/brand/peris-burgundy.png" alt="PÉRIS" />
            <div className="admin-identity">
              <p className="eyebrow">{user.role}</p>
              <p>
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
          <div className="admin-actions">
            <Link to="/" className="link-quiet">
              View the shop
            </Link>
            <button
              type="button"
              className="btn btn-line"
              onClick={() => {
                void staffSignOut();
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <nav className="admin-nav" aria-label="Desk">
          <div className="admin-nav-group">
            <p className="eyebrow">Sales</p>
            <div className="admin-nav-links">
              <Link to="/admin" aria-current={adminCurrent("/admin", location.pathname)}>
                Orders
              </Link>
              <Link
                to="/admin/inventory"
                aria-current={adminCurrent("/admin/inventory", location.pathname)}
              >
                Stock
              </Link>
              <Link
                to="/admin/bespoke"
                aria-current={adminCurrent("/admin/bespoke", location.pathname)}
              >
                Atelier
              </Link>
              {canWriteShipping ? (
                <Link
                  to="/admin/shipping"
                  aria-current={adminCurrent("/admin/shipping", location.pathname)}
                >
                  Delivery
                </Link>
              ) : null}
              {canWriteMarketing ? (
                <Link
                  to="/admin/coupons"
                  aria-current={adminCurrent("/admin/coupons", location.pathname)}
                >
                  Coupons
                </Link>
              ) : null}
            </div>
          </div>
          <div className="admin-nav-group">
            <p className="eyebrow">Catalogue</p>
            <div className="admin-nav-links">
              <Link
                to="/admin/products"
                aria-current={adminCurrent("/admin/products", location.pathname)}
              >
                Pieces
              </Link>
              {canWriteProducts ? (
                <>
                  <Link
                    to="/admin/categories"
                    aria-current={adminCurrent("/admin/categories", location.pathname)}
                  >
                    Collections
                  </Link>
                  <Link
                    to="/admin/lengths"
                    aria-current={adminCurrent("/admin/lengths", location.pathname)}
                  >
                    Lengths
                  </Link>
                  <Link
                    to="/admin/sizes"
                    aria-current={adminCurrent("/admin/sizes", location.pathname)}
                  >
                    Sizes
                  </Link>
                  <Link
                    to="/admin/colors"
                    aria-current={adminCurrent("/admin/colors", location.pathname)}
                  >
                    Colors
                  </Link>
                  <Link
                    to="/admin/fabrics"
                    aria-current={adminCurrent("/admin/fabrics", location.pathname)}
                  >
                    Fabrics
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          {showHouse ? (
            <div className="admin-nav-group">
              <p className="eyebrow">House</p>
              <div className="admin-nav-links">
                {canWriteContent ? (
                  <>
                    <Link
                      to="/admin/announcements"
                      aria-current={adminCurrent("/admin/announcements", location.pathname)}
                    >
                      Notice
                    </Link>
                    <Link
                      to="/admin/pages"
                      aria-current={adminCurrent("/admin/pages", location.pathname)}
                    >
                      Drafts
                    </Link>
                  </>
                ) : null}
                {canWriteMarketing ? (
                  <Link
                    to="/admin/newsletter"
                    aria-current={adminCurrent("/admin/newsletter", location.pathname)}
                  >
                    Notes
                  </Link>
                ) : null}
                {canWriteSettings ? (
                  <>
                    <Link
                      to="/admin/settings"
                      aria-current={adminCurrent("/admin/settings", location.pathname)}
                    >
                      Settings
                    </Link>
                    <Link
                      to="/admin/maintenance"
                      aria-current={adminCurrent("/admin/maintenance", location.pathname)}
                    >
                      Closure
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          {showPeople ? (
            <div className="admin-nav-group">
              <p className="eyebrow">People</p>
              <div className="admin-nav-links">
                {canReadCustomers ? (
                  <Link
                    to="/admin/customers"
                    aria-current={adminCurrent("/admin/customers", location.pathname, false)}
                  >
                    Customers
                  </Link>
                ) : null}
                {canWriteCustomers ? (
                  <>
                    <Link
                      to="/admin/appointments"
                      aria-current={adminCurrent("/admin/appointments", location.pathname)}
                    >
                      Visits
                    </Link>
                    <Link
                      to="/admin/messages"
                      aria-current={adminCurrent("/admin/messages", location.pathname)}
                    >
                      Messages
                    </Link>
                  </>
                ) : null}
                {canModerateReviews ? (
                  <Link
                    to="/admin/reviews"
                    aria-current={adminCurrent("/admin/reviews", location.pathname)}
                  >
                    Reviews
                  </Link>
                ) : null}
                {canReadAudit ? (
                  <Link
                    to="/admin/audit"
                    aria-current={adminCurrent("/admin/audit", location.pathname)}
                  >
                    History
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </nav>
        {children}
      </div>
    </main>
  );
}

function loadDesk(range: DeskRange, fromDate: string, untilDate: string) {
  return staffFetch<{ dashboard: Dashboard }>(
    `/api/v1/admin/dashboard?${periodQuery(range, fromDate, untilDate).toString()}`,
  ).then((body) => body.dashboard);
}

function loadOrders(
  search: string,
  range: DeskRange,
  fromDate: string,
  untilDate: string,
) {
  const params = periodQuery(range, fromDate, untilDate);
  if (search) params.set("q", search);
  return staffFetch<{ orders: DeskOrder[] }>(
    `/api/v1/admin/orders?${params.toString()}`,
  ).then((body) => body.orders);
}

function periodQuery(range: DeskRange, fromDate: string, untilDate: string) {
  const params = new URLSearchParams({ range });
  if (range === "custom") {
    params.set("from", fromDate);
    params.set("until", untilDate);
  }
  return params;
}

function dubaiInputDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function formatInputDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "Custom";
  return new Intl.DateTimeFormat("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    ),
  );
}

function PreparationCell({
  order,
  choice,
  tracking,
  trackingUrl,
  carrier,
  pending,
  onChoice,
  onTracking,
  onTrackingUrl,
  onCarrier,
  onAdvance,
}: {
  order: DeskOrder;
  choice: string;
  tracking: string;
  trackingUrl: string;
  carrier: string;
  pending: boolean;
  onChoice: (value: string) => void;
  onTracking: (value: string) => void;
  onTrackingUrl: (value: string) => void;
  onCarrier: (value: string) => void;
  onAdvance: () => void;
}) {
  return (
    <div className="stack-form">
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
      {order.nextSteps.length > 0 ? (
        <>
          <label className="field">
            <span>Next step</span>
            <select
              value={choice}
              onChange={(event) => onChoice(event.target.value)}
            >
              {order.nextSteps.map((step) => (
                <option key={step.status} value={step.status}>
                  {step.label}
                </option>
              ))}
            </select>
          </label>
          {choice === "SHIPPED" ? (
            <>
              <label className="field">
                <span>Tracking number</span>
                <input
                  value={tracking}
                  onChange={(event) => onTracking(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Tracking link</span>
                <input
                  value={trackingUrl}
                  placeholder="https://"
                  onChange={(event) => onTrackingUrl(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Courier</span>
                <input
                  value={carrier}
                  placeholder="Courier"
                  onChange={(event) => onCarrier(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <button
            type="button"
            className="btn btn-line"
            disabled={pending || !choice}
            onClick={onAdvance}
          >
            Save step
          </button>
        </>
      ) : null}
    </div>
  );
}
