import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isPublished: boolean;
  pieces: number;
};

export function AdminCategoriesPage() {
  const user = useStaffSession((state) => state.user);
  const [categories, setCategories] = useState<DeskCollection[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newLine, setNewLine] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  useSeo("Collections — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ categories: DeskCollection[] }>("/api/v1/admin/categories")
      .then((body) => {
        setCategories(body.categories);
        setNames((current) => {
          const next = { ...current };
          for (const category of body.categories) {
            if (next[category.id] === undefined) next[category.id] = category.name;
          }
          return next;
        });
        setLines((current) => {
          const next = { ...current };
          for (const category of body.categories) {
            if (next[category.id] === undefined) next[category.id] = category.description;
          }
          return next;
        });
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "Collections could not be opened."));
  }, [user]);

  function setPublished(category: DeskCollection, isPublished: boolean) {
    setSaving(category.id);
    setNote("");
    void staffFetch<{ category: DeskCollection }>(`/api/v1/admin/categories/${encodeURIComponent(category.id)}`, {
      method: "POST",
      body: JSON.stringify({ isPublished }),
    })
      .then((body) => {
        setCategories((current) => current.map((item) => (item.id === body.category.id ? body.category : item)));
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The collection was not changed."))
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Collections</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A hidden collection leaves the shop. The pieces stay published. The name appears on the collection tile. The description appears on the collection tile.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <section className="admin-create">
        <h2>Add a collection</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            setCreating(true);
            setNote("");
            void staffFetch<{ category: DeskCollection }>("/api/v1/admin/categories", {
              method: "POST",
              body: JSON.stringify({
                name: newName.trim(),
                description: newLine.trim(),
                slug: newSlug.trim() || undefined,
              }),
            })
              .then((body) => {
                setCategories((current) => [...current, body.category]);
                setNames((current) => ({ ...current, [body.category.id]: body.category.name }));
                setLines((current) => ({
                  ...current,
                  [body.category.id]: body.category.description,
                }));
                setNewName("");
                setNewLine("");
                setNewSlug("");
                setNote(`${body.category.name} is on the desk.`);
              })
              .catch((error: unknown) =>
                setNote(error instanceof Error ? error.message : "The collection was not saved."),
              )
              .finally(() => setCreating(false));
          }}
        >
          <div className="admin-create-grid">
            <label className="field">
              <span>Name</span>
              <input value={newName} onChange={(event) => setNewName(event.target.value)} required />
            </label>
            <label className="field">
              <span>Slug</span>
              <input
                value={newSlug}
                onChange={(event) => setNewSlug(event.target.value)}
                placeholder="optional"
              />
            </label>
            <label className="field field-span">
              <span>Description</span>
              <textarea
                rows={3}
                value={newLine}
                onChange={(event) => setNewLine(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="btn btn-fill" style={{ justifySelf: "start", marginTop: 8 }} disabled={creating}>
            Save collection
          </button>
        </form>
      </section>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Collection</th>
            <th>Pieces</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td colSpan={3}>No collections are on the desk.</td>
            </tr>
          ) : (
            categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <strong>{category.name}</strong>
                  <label className="field">
                    <span>Name</span>
                    <input
                      aria-label={`Name for ${category.slug}`}
                      value={names[category.id] ?? category.name}
                      onChange={(event) => setNames((current) => ({ ...current, [category.id]: event.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the name for ${category.slug}`}
                    disabled={saving === `${category.id}:name`}
                    onClick={() => {
                      const name = (names[category.id] ?? category.name).trim();
                      if (name.length < 2) {
                        setNote("Write the collection name.");
                        return;
                      }
                      setSaving(`${category.id}:name`);
                      setNote("");
                      void staffFetch<{ category: DeskCollection }>(`/api/v1/admin/categories/${encodeURIComponent(category.id)}/name`, {
                        method: "POST",
                        body: JSON.stringify({ name }),
                      })
                        .then((body) => {
                          setCategories((current) => current.map((item) => (item.id === body.category.id ? body.category : item)));
                          setNames((current) => ({ ...current, [body.category.id]: body.category.name }));
                        })
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The name was not saved."))
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save name
                  </button>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      aria-label={`Description for ${category.name}`}
                      value={lines[category.id] ?? category.description}
                      onChange={(event) => setLines((current) => ({ ...current, [category.id]: event.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the description for ${category.name}`}
                    disabled={saving === `${category.id}:line`}
                    onClick={() => {
                      const description = (lines[category.id] ?? category.description).trim();
                      if (description.length < 8) {
                        setNote("Write the description in a full sentence.");
                        return;
                      }
                      setSaving(`${category.id}:line`);
                      setNote("");
                      void staffFetch<{ category: DeskCollection }>(`/api/v1/admin/categories/${encodeURIComponent(category.id)}/description`, {
                        method: "POST",
                        body: JSON.stringify({ description }),
                      })
                        .then((body) => {
                          setCategories((current) => current.map((item) => (item.id === body.category.id ? body.category : item)));
                          setLines((current) => ({ ...current, [body.category.id]: body.category.description }));
                        })
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The description was not saved."))
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save description
                  </button>
                </td>
                <td>{category.pieces}</td>
                <td>
                  <p>{category.isPublished ? "Shown" : "Hidden"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`${category.isPublished ? "Hide" : "Show"} ${category.name}`}
                    disabled={saving === category.id}
                    onClick={() => setPublished(category, !category.isPublished)}
                  >
                    {category.isPublished ? "Hide collection" : "Show collection"}
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
