import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskColor = {
  id: string;
  name: string;
  hex: string;
  isActive: boolean;
};

export function AdminColorsPage() {
  const user = useStaffSession((state) => state.user);
  const [colors, setColors] = useState<DeskColor[]>([]);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#161616");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  const [creating, setCreating] = useState(false);
  useSeo("Colors — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ colors: DeskColor[] }>("/api/v1/admin/colors")
      .then((body) => setColors(body.colors))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The colors could not be opened."));
  }, [user]);

  function setActive(color: DeskColor, isActive: boolean) {
    setSaving(color.id);
    setNote("");
    void staffFetch<{ color: DeskColor }>(`/api/v1/admin/colors/${encodeURIComponent(color.id)}`, {
      method: "POST",
      body: JSON.stringify({ isActive }),
    })
      .then((body) => {
        setColors((current) => current.map((item) => (item.id === body.color.id ? body.color : item)));
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The color was not changed."))
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Catalog</p>
        <h1>Colors</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A hidden color leaves the piece page, the shop filters, and the bespoke color list. Stock for that color stays on the desk.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <section className="admin-create">
        <h2>Add a color</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            setCreating(true);
            setNote("");
            void staffFetch<{ color: DeskColor }>("/api/v1/admin/colors", {
              method: "POST",
              body: JSON.stringify({ name: name.trim(), hex: hex.trim() }),
            })
              .then((body) => {
                setColors((current) => [...current, body.color]);
                setName("");
                setHex("#161616");
                setNote(`${body.color.name} is on the desk.`);
              })
              .catch((error: unknown) =>
                setNote(error instanceof Error ? error.message : "The color was not saved."),
              )
              .finally(() => setCreating(false));
          }}
        >
          <div className="admin-create-grid">
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="field">
              <span>Hex</span>
              <input value={hex} onChange={(event) => setHex(event.target.value)} placeholder="#161616" required />
            </label>
          </div>
          <button type="submit" className="btn btn-fill" style={{ justifySelf: "start", marginTop: 8 }} disabled={creating}>
            Save color
          </button>
        </form>
      </section>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Color</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {colors.length === 0 ? (
            <tr>
              <td colSpan={2}>No color is on the desk.</td>
            </tr>
          ) : (
            colors.map((color) => (
              <tr key={color.id}>
                <td>
                  <strong>{color.name}</strong>
                  <p className="notice" style={{ border: 0, paddingTop: 4 }}>
                    <span className="swatch" style={{ background: color.hex, display: "inline-block", verticalAlign: "middle" }} />{" "}
                    {color.hex}
                  </p>
                </td>
                <td>
                  <p>{color.isActive ? "Shown" : "Hidden"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`${color.isActive ? "Hide" : "Show"} ${color.name}`}
                    disabled={saving === color.id}
                    onClick={() => setActive(color, !color.isActive)}
                  >
                    {color.isActive ? "Hide" : "Show"}
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
