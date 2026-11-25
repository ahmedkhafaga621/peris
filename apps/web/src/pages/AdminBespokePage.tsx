import { useEffect, useState } from "react";
import { formatAed } from "@peris/shared";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type AtelierRequest = {
  number: string;
  name: string;
  email: string;
  phone: string;
  design: string;
  fabric: string;
  color: string;
  notes: string | null;
  status: string;
  statusLabel: string;
  canReview: boolean;
  canQuote: boolean;
  quote: { amountFils: number; message: string } | null;
};

export function AdminBespokePage() {
  const permissions = useStaffSession((state) => state.user?.permissions ?? []);
  const [rows, setRows] = useState<AtelierRequest[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState("");

  useEffect(() => {
    void load().then(setRows).catch((error: unknown) => setNote(error instanceof Error ? error.message : "The queue did not open."));
  }, []);

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Atelier</p>
        <h1>Bespoke requests</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Type the atelier price in whole dirhams. The customer sees that quote on the account.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      {rows.length === 0 ? <p>No requests yet.</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Request</th>
            <th>Customer</th>
            <th>Piece</th>
            <th>Notes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.number}>
              <td>{row.number}</td>
              <td>
                {row.name}
                <br />
                {row.email}
                <br />
                {row.phone}
              </td>
              <td>
                {row.design}
                <br />
                {row.fabric}, {row.color}
              </td>
              <td style={{ whiteSpace: "pre-wrap" }}>{row.notes}</td>
              <td>
                {row.statusLabel}
                {row.quote ? (
                  <p>
                    {formatAed(row.quote.amountFils)}. {row.quote.message}
                  </p>
                ) : null}
                {row.canReview && permissions.includes("bespoke.write") ? (
                  <button
                    type="button"
                    className="btn btn-line"
                    disabled={pending === row.number}
                    onClick={() => {
                      setPending(row.number);
                      setNote("");
                      void staffFetch<{ request: AtelierRequest }>(`/api/v1/admin/bespoke/${encodeURIComponent(row.number)}/review`, {
                        method: "POST",
                      })
                        .then(() => load())
                        .then(setRows)
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The request was not marked in review."))
                        .finally(() => setPending(""));
                    }}
                  >
                    Mark in review
                  </button>
                ) : null}
                {row.canQuote && permissions.includes("bespoke.write") ? (
                  <QuoteForm
                    number={row.number}
                    pending={pending === row.number}
                    onSend={(dirhams, message) => {
                      const amount = Number(dirhams);
                      if (!Number.isInteger(amount) || amount < 1 || amount > 50_000) {
                        setNote("Enter the quote in whole dirhams.");
                        return;
                      }
                      if (message.trim().length < 2) {
                        setNote("Add a short note with the quote.");
                        return;
                      }
                      setPending(row.number);
                      setNote("");
                      void staffFetch<{ request: AtelierRequest }>(`/api/v1/admin/bespoke/${encodeURIComponent(row.number)}/quote`, {
                        method: "POST",
                        body: JSON.stringify({ amountFils: amount * 100, message: message.trim() }),
                      })
                        .then(() => load())
                        .then(setRows)
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The quote was not sent."))
                        .finally(() => setPending(""));
                    }}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminChrome>
  );
}

function QuoteForm({
  number,
  pending,
  onSend,
}: {
  number: string;
  pending: boolean;
  onSend: (dirhams: string, message: string) => void;
}) {
  const [dirhams, setDirhams] = useState("");
  const [message, setMessage] = useState("");
  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(dirhams, message);
      }}
    >
      <label className="field">
        <span>Quote, AED</span>
        <input
          inputMode="numeric"
          aria-label={`Quote dirhams ${number}`}
          value={dirhams}
          onChange={(event) => setDirhams(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Note</span>
        <input aria-label={`Quote note ${number}`} value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <button type="submit" className="btn btn-line" disabled={pending}>
        Send quote
      </button>
    </form>
  );
}

function load() {
  return staffFetch<{ requests: AtelierRequest[] }>("/api/v1/admin/bespoke").then((body) => body.requests);
}
