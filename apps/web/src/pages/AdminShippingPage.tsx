import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskRate = {
  id: string;
  zone: string;
  emirate: string;
  method: string;
  minDays: number;
  maxDays: number;
  codAllowed: boolean;
  priceFils: number;
  freeOverFils: number | null;
};

type Draft = {
  price: string;
  freeOver: string;
  minDays: string;
  maxDays: string;
  codAllowed: boolean;
};

function draftFrom(rate: DeskRate): Draft {
  return {
    price: String(rate.priceFils / 100),
    freeOver: rate.freeOverFils == null ? "" : String(rate.freeOverFils / 100),
    minDays: String(rate.minDays),
    maxDays: String(rate.maxDays),
    codAllowed: rate.codAllowed,
  };
}

export function AdminShippingPage() {
  const user = useStaffSession((state) => state.user);
  const [rates, setRates] = useState<DeskRate[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  useSeo("Delivery — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ rates: DeskRate[] }>("/api/v1/admin/shipping")
      .then((body) => {
        setRates(body.rates);
        setDrafts((current) => {
          const next = { ...current };
          for (const rate of body.rates) {
            if (next[rate.id] == null) next[rate.id] = draftFrom(rate);
          }
          return next;
        });
      })
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "Delivery could not be opened.",
        ),
      );
  }, [user]);

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Delivery</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Dubai is the only delivery on the desk. Fees already include 5% VAT.
          Edit the fee, free-delivery threshold, ETA, and whether cash on
          delivery is allowed.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Place</th>
            <th>Settings</th>
          </tr>
        </thead>
        <tbody>
          {rates.length === 0 ? (
            <tr>
              <td colSpan={2}>No delivery is on the desk.</td>
            </tr>
          ) : (
            rates.map((rate) => {
              const draft = drafts[rate.id] ?? draftFrom(rate);
              return (
                <tr key={rate.id}>
                  <td>
                    <strong>{rate.zone}</strong>
                    <p>{rate.method}</p>
                    <p>
                      {rate.minDays}–{rate.maxDays} days
                    </p>
                    <p>{rate.codAllowed ? "Cash on delivery" : "Card only"}</p>
                    {rate.freeOverFils == null ? (
                      <p>No free delivery</p>
                    ) : (
                      <p>Free from AED {rate.freeOverFils / 100}</p>
                    )}
                  </td>
                  <td>
                    <label className="field">
                      <span>Fee, whole dirhams</span>
                      <input
                        inputMode="numeric"
                        aria-label={`Delivery fee for ${rate.zone}`}
                        value={draft.price}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [rate.id]: {
                              ...draft,
                              price: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Free over, whole dirhams</span>
                      <input
                        inputMode="numeric"
                        aria-label={`Free delivery threshold for ${rate.zone}`}
                        placeholder="Leave blank for none"
                        value={draft.freeOver}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [rate.id]: {
                              ...draft,
                              freeOver: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Shortest days</span>
                      <input
                        inputMode="numeric"
                        aria-label={`Shortest delivery days for ${rate.zone}`}
                        value={draft.minDays}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [rate.id]: {
                              ...draft,
                              minDays: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Longest days</span>
                      <input
                        inputMode="numeric"
                        aria-label={`Longest delivery days for ${rate.zone}`}
                        value={draft.maxDays}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [rate.id]: {
                              ...draft,
                              maxDays: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>
                        <input
                          type="checkbox"
                          checked={draft.codAllowed}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [rate.id]: {
                                ...draft,
                                codAllowed: event.target.checked,
                              },
                            }))
                          }
                        />{" "}
                        Cash on delivery allowed
                      </span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-line"
                      aria-label={`Save delivery for ${rate.zone}`}
                      disabled={saving === rate.id}
                      onClick={() => {
                        const amount = Number(draft.price.trim());
                        const freeOverRaw = draft.freeOver.trim();
                        const freeOver =
                          freeOverRaw.length === 0
                            ? null
                            : Number(freeOverRaw);
                        const minDays = Number(draft.minDays.trim());
                        const maxDays = Number(draft.maxDays.trim());
                        if (!Number.isInteger(amount) || amount < 0) {
                          setNote("Enter the delivery fee in whole dirhams.");
                          return;
                        }
                        if (
                          freeOver != null &&
                          (!Number.isInteger(freeOver) || freeOver < 0)
                        ) {
                          setNote(
                            "Enter the free-delivery threshold in whole dirhams, or leave it blank.",
                          );
                          return;
                        }
                        if (
                          !Number.isInteger(minDays) ||
                          !Number.isInteger(maxDays) ||
                          minDays < 0 ||
                          maxDays < minDays
                        ) {
                          setNote("Enter a valid delivery day range.");
                          return;
                        }
                        setSaving(rate.id);
                        setNote("");
                        void staffFetch<{ rate: DeskRate }>(
                          `/api/v1/admin/shipping/${encodeURIComponent(rate.id)}`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              priceFils: amount * 100,
                              freeOverFils:
                                freeOver == null ? null : freeOver * 100,
                              estimatedMinDays: minDays,
                              estimatedMaxDays: maxDays,
                              codAllowed: draft.codAllowed,
                            }),
                          },
                        )
                          .then((body) => {
                            setRates((current) =>
                              current.map((item) =>
                                item.id === body.rate.id ? body.rate : item,
                              ),
                            );
                            setDrafts((current) => ({
                              ...current,
                              [body.rate.id]: draftFrom(body.rate),
                            }));
                          })
                          .catch((error: unknown) =>
                            setNote(
                              error instanceof Error
                                ? error.message
                                : "The delivery was not saved.",
                            ),
                          )
                          .finally(() => setSaving(""));
                      }}
                    >
                      Save delivery
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}
