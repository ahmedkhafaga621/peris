import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskFabric = {
  id: string;
  name: string;
  isActive: boolean;
};

export function AdminFabricsPage() {
  const user = useStaffSession((state) => state.user);
  const [fabrics, setFabrics] = useState<DeskFabric[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  const [creating, setCreating] = useState(false);
  useSeo("Fabrics — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ fabrics: DeskFabric[] }>("/api/v1/admin/fabrics")
      .then((body) => setFabrics(body.fabrics))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The fabrics could not be opened."));
  }, [user]);

  function setActive(fabric: DeskFabric, isActive: boolean) {
    setSaving(fabric.id);
    setNote("");
    void staffFetch<{ fabric: DeskFabric }>(`/api/v1/admin/fabrics/${encodeURIComponent(fabric.id)}`, {
      method: "POST",
      body: JSON.stringify({ isActive }),
    })
      .then((body) => {
        setFabrics((current) => current.map((item) => (item.id === body.fabric.id ? body.fabric : item)));
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The fabric was not changed."))
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Catalog</p>
        <h1>Fabrics</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A hidden fabric leaves the bespoke fabric step. The fabric line on each piece stays as it is.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <section className="admin-create">
        <h2>Add a fabric</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            setCreating(true);
            setNote("");
            void staffFetch<{ fabric: DeskFabric }>("/api/v1/admin/fabrics", {
              method: "POST",
              body: JSON.stringify({ name: name.trim() }),
            })
              .then((body) => {
                setFabrics((current) => [...current, body.fabric]);
                setName("");
                setNote(`${body.fabric.name} is on the desk.`);
              })
              .catch((error: unknown) =>
                setNote(error instanceof Error ? error.message : "The fabric was not saved."),
              )
              .finally(() => setCreating(false));
          }}
        >
          <label className="field" style={{ maxWidth: 360 }}>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <button type="submit" className="btn btn-fill" style={{ justifySelf: "start" }} disabled={creating}>
            Save fabric
          </button>
        </form>
      </section>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Fabric</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {fabrics.length === 0 ? (
            <tr>
              <td colSpan={2}>No fabric is on the desk.</td>
            </tr>
          ) : (
            fabrics.map((fabric) => (
              <tr key={fabric.id}>
                <td>
                  <strong>{fabric.name}</strong>
                </td>
                <td>
                  <p>{fabric.isActive ? "Shown" : "Hidden"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`${fabric.isActive ? "Hide" : "Show"} ${fabric.name}`}
                    disabled={saving === fabric.id}
                    onClick={() => setActive(fabric, !fabric.isActive)}
                  >
                    {fabric.isActive ? "Hide" : "Show"}
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
