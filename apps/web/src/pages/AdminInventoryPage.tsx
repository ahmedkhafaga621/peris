import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type StockRow = {
  id: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  available: number;
};

type Movement = {
  id: string;
  color: string;
  size: string;
  label: string;
  delta: number;
  reason: string | null;
  createdAt: string;
};

export function AdminInventoryPage() {
  const user = useStaffSession((state) => state.user);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [piece, setPiece] = useState("");
  const [reason, setReason] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState("");
  const [note, setNote] = useState("");
  useSeo("Stock — PERIS");

  useEffect(() => {
    if (!user) return;
    void loadStock()
      .then((inventory) => {
        setRows(inventory);
        setPiece((current) => current || inventory[0]?.productId || "");
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "Stock could not be opened."));
  }, [user]);

  useEffect(() => {
    if (!user || !piece) return;
    void loadHistory(piece)
      .then(setMovements)
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "Movements could not be opened."));
  }, [user, piece]);

  const pieces = [...new Map(rows.map((row) => [row.productId, row.productName]))];
  const visible = rows.filter((row) => row.productId === piece);

  function change(row: StockRow, direction: 1 | -1) {
    const amount = Number(amounts[row.id] ?? "1");
    if (!Number.isInteger(amount) || amount < 1) {
      setNote("Enter a whole number of pieces.");
      return;
    }
    if (reason.trim().length < 2) {
      setNote("Add a short reason for the count.");
      return;
    }
    setPending(row.id);
    setNote("");
    void staffFetch<{ row: StockRow }>(`/api/v1/admin/inventory/${encodeURIComponent(row.id)}`, {
      method: "POST",
      body: JSON.stringify({ delta: direction * amount, reason: reason.trim() }),
    })
      .then((body) => {
        setRows((current) => current.map((item) => (item.id === body.row.id ? body.row : item)));
        return loadHistory(row.productId);
      })
      .then((history) => {
        if (history) setMovements(history);
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The count was not saved."))
      .finally(() => setPending(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Workroom</p>
        <h1>Stock</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          The shop shows what is left after this count. A size cannot be taken below zero.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <label className="field" style={{ maxWidth: 360, marginBottom: 24 }}>
        <span>Piece</span>
        <select value={piece} onChange={(event) => setPiece(event.target.value)}>
          {pieces.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="field" style={{ maxWidth: 360, marginBottom: 24 }}>
        <span>Reason</span>
        <input value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Color</th>
            <th>Size</th>
            <th>Available</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id}>
              <td>{row.color}</td>
              <td>{row.size}</td>
              <td>{row.available}</td>
              <td>
                <label className="field">
                  <span>Count</span>
                  <input
                    aria-label={`Count ${row.color} ${row.size}`}
                    inputMode="numeric"
                    value={amounts[row.id] ?? "1"}
                    onChange={(event) => setAmounts((current) => ({ ...current, [row.id]: event.target.value }))}
                  />
                </label>
                <button type="button" className="btn btn-line" aria-label={`Add ${row.color} ${row.size}`} disabled={pending === row.id} onClick={() => change(row, 1)}>
                  Add
                </button>
                <button type="button" className="btn btn-line" aria-label={`Remove ${row.color} ${row.size}`} disabled={pending === row.id} onClick={() => change(row, -1)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ marginTop: 48 }}>Movements</h2>
      <p className="lede">The latest forty changes for this piece.</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Color</th>
            <th>Size</th>
            <th>Movement</th>
            <th>Change</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <tr>
              <td colSpan={6}>No movements for this piece yet.</td>
            </tr>
          ) : (
            movements.map((movement) => (
              <tr key={movement.id}>
                <td>{formatWhen(movement.createdAt)}</td>
                <td>{movement.color}</td>
                <td>{movement.size}</td>
                <td>{movement.label}</td>
                <td>{movement.delta > 0 ? `+${movement.delta}` : movement.delta}</td>
                <td>{movement.reason ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}

function loadStock() {
  return staffFetch<{ inventory: StockRow[] }>("/api/v1/admin/inventory").then((body) => body.inventory);
}

function loadHistory(productId: string) {
  return staffFetch<{ movements: Movement[] }>(`/api/v1/admin/inventory/history?productId=${encodeURIComponent(productId)}`).then(
    (body) => body.movements,
  );
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
