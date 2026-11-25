import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatAed } from "@peris/shared";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type OrderSheet = {
  number: string;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  statusLabel: string;
  payment: string;
  method: string;
  items: {
    id: string;
    name: string;
    color: string;
    size: string;
    fabric: string;
    lengthLabel: string | null;
    quantity: number;
    unitPriceFils: number;
    lineTotalFils: number;
  }[];
  subtotalFils: number;
  shippingFils: number;
  vatFils: number;
  totalFils: number;
};

export function AdminOrderPage() {
  const { number } = useParams();
  const user = useStaffSession((state) => state.user);
  const [order, setOrder] = useState<OrderSheet | null>(null);
  const [problem, setProblem] = useState("");
  useSeo(number ? `${number} — PERIS` : "Order — PERIS");

  useEffect(() => {
    if (!user || !number) return;
    void staffFetch<{ order: OrderSheet }>(`/api/v1/admin/orders/${encodeURIComponent(number)}`)
      .then((body) => setOrder(body.order))
      .catch((error: unknown) => setProblem(error instanceof Error ? error.message : "That order could not be opened."));
  }, [user, number]);

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Workroom copy</p>
        <h1>{order?.number ?? number ?? "Order"}</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Workroom copy. No tax registration number is stored, so this is not a tax invoice.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link to="/admin">All orders</Link>
        </p>
      </header>
      {problem ? <p className="notice">{problem}</p> : null}
      {order ? (
        <>
          <p>
            {formatWhen(order.createdAt)}. {order.statusLabel}. {order.payment}. {order.method}.
          </p>
          <p>
            {order.customerName}. {order.email}. {order.phone}.
          </p>
          <p>{order.addressLine}</p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Piece</th>
                <th>Quantity</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.name}, {item.color}, {item.size}
                    {item.lengthLabel ? `, ${item.lengthLabel}` : ""}, {item.fabric}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatAed(item.lineTotalFils)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Pieces {formatAed(order.subtotalFils)}</p>
          <p>Delivery {formatAed(order.shippingFils)}</p>
          <p>
            Total {formatAed(order.totalFils)}, including VAT of {formatAed(order.vatFils)}
          </p>
        </>
      ) : null}
    </AdminChrome>
  );
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
