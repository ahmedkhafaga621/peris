import { useEffect, useState } from "react";
import { formatAed } from "@peris/shared";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskCoupon = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  amount: number;
  minSubtotalFils: number;
  isActive: boolean;
};

export function AdminCouponsPage() {
  const user = useStaffSession((state) => state.user);
  const [coupons, setCoupons] = useState<DeskCoupon[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState<DeskCoupon["type"]>("PERCENT");
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  useSeo("Coupons — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ coupons: DeskCoupon[] }>("/api/v1/admin/coupons")
      .then((body) => setCoupons(body.coupons))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "Coupons could not be opened.",
        ),
      );
  }, [user]);

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Coupons</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Codes apply at checkout. Seeded desk check code is PERIS10 for ten
          percent.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <form
        className="stack-form"
        style={{ maxWidth: 420, marginBottom: 40 }}
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(amount.trim());
          if (!code.trim()) {
            setNote("Write a code.");
            return;
          }
          if (type !== "FREE_SHIPPING" && (!Number.isInteger(value) || value < 0)) {
            setNote("Enter a whole amount.");
            return;
          }
          setSaving(true);
          setNote("");
          void staffFetch<{ coupon: DeskCoupon }>("/api/v1/admin/coupons", {
            method: "POST",
            body: JSON.stringify({
              code: code.trim(),
              type,
              amount:
                type === "FREE_SHIPPING"
                  ? 0
                  : type === "FIXED"
                    ? value * 100
                    : value,
              minSubtotalFils: 0,
              isActive: true,
            }),
          })
            .then((body) => {
              setCoupons((current) => [...current, body.coupon].sort((a, b) =>
                a.code.localeCompare(b.code),
              ));
              setCode("");
              setAmount(type === "PERCENT" ? "10" : "25");
            })
            .catch((error: unknown) =>
              setNote(
                error instanceof Error
                  ? error.message
                  : "The coupon was not saved.",
              ),
            )
            .finally(() => setSaving(false));
        }}
      >
        <label className="field">
          <span>Code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-label="Coupon code"
          />
        </label>
        <label className="field">
          <span>Type</span>
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as DeskCoupon["type"])
            }
          >
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed AED</option>
            <option value="FREE_SHIPPING">Free delivery</option>
          </select>
        </label>
        {type !== "FREE_SHIPPING" ? (
          <label className="field">
            <span>{type === "PERCENT" ? "Percent" : "Dirhams"}</span>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" className="btn btn-fill" disabled={saving}>
          Save coupon
        </button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Offer</th>
            <th>Live</th>
          </tr>
        </thead>
        <tbody>
          {coupons.length === 0 ? (
            <tr>
              <td colSpan={3}>No coupon is on the desk.</td>
            </tr>
          ) : (
            coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td>
                  <strong>{coupon.code}</strong>
                </td>
                <td>
                  {coupon.type === "PERCENT"
                    ? `${coupon.amount}%`
                    : coupon.type === "FIXED"
                      ? formatAed(coupon.amount)
                      : "Free delivery"}
                  {coupon.minSubtotalFils > 0
                    ? ` · from ${formatAed(coupon.minSubtotalFils)}`
                    : ""}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-line"
                    onClick={() => {
                      setNote("");
                      void staffFetch<{ coupon: DeskCoupon }>(
                        `/api/v1/admin/coupons/${encodeURIComponent(coupon.id)}`,
                        {
                          method: "POST",
                          body: JSON.stringify({ isActive: !coupon.isActive }),
                        },
                      )
                        .then((body) =>
                          setCoupons((current) =>
                            current.map((item) =>
                              item.id === body.coupon.id ? body.coupon : item,
                            ),
                          ),
                        )
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The coupon was not updated.",
                          ),
                        );
                    }}
                  >
                    {coupon.isActive ? "Turn off" : "Turn on"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}
