import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

export function AdminMaintenancePage() {
  const user = useStaffSession((state) => state.user);
  const [closed, setClosed] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  useSeo("Closure — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ closed: boolean }>("/api/v1/admin/maintenance")
      .then((body) => setClosed(body.closed))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The closure could not be opened."));
  }, [user]);

  function setHouse(next: boolean) {
    setSaving(true);
    setNote("");
    void staffFetch<{ closed: boolean }>("/api/v1/admin/maintenance", {
      method: "POST",
      body: JSON.stringify({ closed: next }),
    })
      .then((body) => setClosed(body.closed))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The house was not changed."))
      .finally(() => setSaving(false));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Closure</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Closing the house replaces the shop with a short note. The note uses the boutique hours and the address. The desk stays open.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <p>{closed == null ? "Opening the closure." : closed ? "The house is closed." : "The house is open."}</p>
      {closed == null ? null : (
        <button
          type="button"
          className="btn btn-line"
          aria-label={closed ? "Open the house" : "Close the house"}
          disabled={saving}
          onClick={() => setHouse(!closed)}
        >
          {closed ? "Open the house" : "Close the house"}
        </button>
      )}
    </AdminChrome>
  );
}
