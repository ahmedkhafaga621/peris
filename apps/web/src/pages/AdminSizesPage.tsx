import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskSize = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export function AdminSizesPage() {
  const user = useStaffSession((state) => state.user);
  const [sizes, setSizes] = useState<DeskSize[]>([]);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  const [creating, setCreating] = useState(false);
  useSeo("Sizes — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ sizes: DeskSize[] }>("/api/v1/admin/sizes")
      .then((body) => setSizes(body.sizes))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The sizes could not be opened."));
  }, [user]);

  function setActive(size: DeskSize, isActive: boolean) {
    setSaving(size.id);
    setNote("");
    void staffFetch<{ size: DeskSize }>(`/api/v1/admin/sizes/${encodeURIComponent(size.id)}`, {
      method: "POST",
      body: JSON.stringify({ isActive }),
    })
      .then((body) => {
        setSizes((current) => current.map((item) => (item.id === body.size.id ? body.size : item)));
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The size was not changed."))
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Catalog</p>
        <h1>Sizes</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A hidden size leaves the piece page and the size guide. Stock for that size stays on the desk.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <section className="admin-create">
        <h2>Add a size</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            setCreating(true);
            setNote("");
            void staffFetch<{ size: DeskSize }>("/api/v1/admin/sizes", {
              method: "POST",
              body: JSON.stringify({ code: code.trim() }),
            })
              .then((body) => {
                setSizes((current) => [...current, body.size]);
                setCode("");
                setNote(`${body.size.code} is on the desk.`);
              })
              .catch((error: unknown) =>
                setNote(error instanceof Error ? error.message : "The size was not saved."),
              )
              .finally(() => setCreating(false));
          }}
        >
          <label className="field" style={{ maxWidth: 280 }}>
            <span>Code</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="4XL" required />
          </label>
          <button type="submit" className="btn btn-fill" style={{ justifySelf: "start" }} disabled={creating}>
            Save size
          </button>
        </form>
      </section>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {sizes.length === 0 ? (
            <tr>
              <td colSpan={2}>No size is on the desk.</td>
            </tr>
          ) : (
            sizes.map((size) => (
              <tr key={size.id}>
                <td>
                  <strong>{size.code}</strong>
                </td>
                <td>
                  <p>{size.isActive ? "Shown" : "Hidden"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`${size.isActive ? "Hide" : "Show"} ${size.code}`}
                    disabled={saving === size.id}
                    onClick={() => setActive(size, !size.isActive)}
                  >
                    {size.isActive ? "Hide" : "Show"}
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
