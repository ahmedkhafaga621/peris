import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type AuditEntry = {
  id: string;
  createdAt: string;
  actor: string;
  label: string;
  detail: string;
};

export function AdminAuditPage() {
  const user = useStaffSession((state) => state.user);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  useSeo("History — PERIS");

  useEffect(() => {
    if (!user) return;
    void loadAudit(search)
      .then(setEntries)
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The history could not be opened."));
  }, [user, search]);

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>History</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          The latest eighty actions recorded by the desk. This list does not change an order.
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
          <span>Find an action</span>
          <input aria-label="Find an action" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="submit" className="btn btn-line">
          Look up
        </button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4}>{search ? "No action matches that search." : "No actions are recorded yet."}</td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatWhen(entry.createdAt)}</td>
                <td>{entry.actor}</td>
                <td>{entry.label}</td>
                <td>{entry.detail}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}

function loadAudit(search: string) {
  const path = search ? `/api/v1/admin/audit?q=${encodeURIComponent(search)}` : "/api/v1/admin/audit";
  return staffFetch<{ entries: AuditEntry[] }>(path).then((body) => body.entries);
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
