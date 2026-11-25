import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskLength = {
  id: string;
  label: string;
  inches: number;
  isActive: boolean;
};

export function AdminLengthsPage() {
  const user = useStaffSession((state) => state.user);
  const [lengths, setLengths] = useState<DeskLength[]>([]);
  const [inches, setInches] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  const [creating, setCreating] = useState(false);
  useSeo("Lengths — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ lengths: DeskLength[] }>("/api/v1/admin/lengths")
      .then((body) => setLengths(body.lengths))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The lengths could not be opened."));
  }, [user]);

  function setActive(length: DeskLength, isActive: boolean) {
    setSaving(length.id);
    setNote("");
    void staffFetch<{ length: DeskLength }>(`/api/v1/admin/lengths/${encodeURIComponent(length.id)}`, {
      method: "POST",
      body: JSON.stringify({ isActive }),
    })
      .then((body) => {
        setLengths((current) =>
          current
            .map((item) => (item.id === body.length.id ? body.length : item))
            .sort((a, b) => a.inches - b.inches),
        );
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The length was not changed."))
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Catalog</p>
        <h1>Lengths</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A hidden length leaves the piece page, the size guide, the bespoke length step, and the saved-measurement form. The length line follows the cuts still offered. A measurement already saved keeps its length.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <section className="admin-create">
        <h2>Add a length</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(inches.trim());
            if (!Number.isInteger(value)) {
              setNote("Enter the length in whole inches.");
              return;
            }
            setCreating(true);
            setNote("");
            void staffFetch<{ length: DeskLength }>("/api/v1/admin/lengths", {
              method: "POST",
              body: JSON.stringify({ inches: value }),
            })
              .then((body) => {
                setLengths((current) =>
                  [...current, body.length].sort((a, b) => a.inches - b.inches),
                );
                setInches("");
                setNote(`${body.length.label} is on the desk.`);
              })
              .catch((error: unknown) =>
                setNote(error instanceof Error ? error.message : "The length was not saved."),
              )
              .finally(() => setCreating(false));
          }}
        >
          <label className="field" style={{ maxWidth: 280 }}>
            <span>Inches</span>
            <input
              inputMode="numeric"
              value={inches}
              onChange={(event) => setInches(event.target.value)}
              placeholder="62"
              required
            />
          </label>
          <button type="submit" className="btn btn-fill" style={{ justifySelf: "start" }} disabled={creating}>
            Save length
          </button>
        </form>
      </section>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Length</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {lengths.length === 0 ? (
            <tr>
              <td colSpan={2}>No length is on the desk.</td>
            </tr>
          ) : (
            lengths.map((length) => (
              <tr key={length.id}>
                <td>
                  <strong>{length.label}</strong>
                </td>
                <td>
                  <p>{length.isActive ? "Shown" : "Hidden"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`${length.isActive ? "Hide" : "Show"} ${length.label}`}
                    disabled={saving === length.id}
                    onClick={() => setActive(length, !length.isActive)}
                  >
                    {length.isActive ? "Hide" : "Show"}
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
