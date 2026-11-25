import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskPage = {
  id: string;
  slug: string;
  title: string;
  body: string;
  shown: boolean;
};

export function AdminPagesPage() {
  const user = useStaffSession((state) => state.user);
  const [pages, setPages] = useState<DeskPage[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  useSeo("Drafts — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ pages: DeskPage[] }>("/api/v1/admin/pages")
      .then((body) => {
        setPages(body.pages);
        setTitles((current) => {
          const next = { ...current };
          for (const page of body.pages) {
            if (next[page.id] === undefined) next[page.id] = page.title;
          }
          return next;
        });
        setLines((current) => {
          const next = { ...current };
          for (const page of body.pages) {
            if (next[page.id] === undefined) next[page.id] = page.body;
          }
          return next;
        });
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The drafts could not be opened."));
  }, [user]);

  function setShown(page: DeskPage, shown: boolean) {
    setSaving(page.id);
    setNote("");
    void staffFetch<{ page: DeskPage }>(`/api/v1/admin/pages/${encodeURIComponent(page.id)}`, {
      method: "POST",
      body: JSON.stringify({ shown }),
    })
      .then((body) => {
        setPages((current) => current.map((item) => (item.id === body.page.id ? body.page : item)));
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The draft was not changed."))
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Drafts</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          These pages stay drafts. Hiding one takes it off the shop. Showing it does not approve the policy. The title appears on the draft page. The wording appears on the draft page.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Draft</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {pages.length === 0 ? (
            <tr>
              <td colSpan={2}>No draft is on the desk.</td>
            </tr>
          ) : (
            pages.map((page) => (
              <tr key={page.id}>
                <td>
                  <strong>{page.title}</strong>
                  <label className="field">
                    <span>Title</span>
                    <input
                      aria-label={`Title for ${page.slug}`}
                      value={titles[page.id] ?? page.title}
                      onChange={(event) => setTitles((current) => ({ ...current, [page.id]: event.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the title for ${page.slug}`}
                    disabled={saving === `${page.id}:title`}
                    onClick={() => {
                      const title = (titles[page.id] ?? page.title).trim();
                      if (title.length < 2) {
                        setNote("Write the draft title.");
                        return;
                      }
                      setSaving(`${page.id}:title`);
                      setNote("");
                      void staffFetch<{ page: DeskPage }>(`/api/v1/admin/pages/${encodeURIComponent(page.id)}/title`, {
                        method: "POST",
                        body: JSON.stringify({ title }),
                      })
                        .then((body) => {
                          setPages((current) => current.map((item) => (item.id === body.page.id ? body.page : item)));
                          setTitles((current) => ({ ...current, [body.page.id]: body.page.title }));
                        })
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The title was not saved."))
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save title
                  </button>
                  <label className="field">
                    <span>Wording</span>
                    <textarea
                      aria-label={`Wording for ${page.slug}`}
                      value={lines[page.id] ?? page.body}
                      onChange={(event) => setLines((current) => ({ ...current, [page.id]: event.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`Save the wording for ${page.slug}`}
                    disabled={saving === `${page.id}:line`}
                    onClick={() => {
                      const wording = (lines[page.id] ?? page.body).trim();
                      if (wording.length < 8) {
                        setNote("Write the draft in a full sentence.");
                        return;
                      }
                      setSaving(`${page.id}:line`);
                      setNote("");
                      void staffFetch<{ page: DeskPage }>(`/api/v1/admin/pages/${encodeURIComponent(page.id)}/body`, {
                        method: "POST",
                        body: JSON.stringify({ body: wording }),
                      })
                        .then((body) => {
                          setPages((current) => current.map((item) => (item.id === body.page.id ? body.page : item)));
                          setLines((current) => ({ ...current, [body.page.id]: body.page.body }));
                        })
                        .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The wording was not saved."))
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save wording
                  </button>
                </td>
                <td>
                  <p>{page.shown ? "Shown as a draft" : "Hidden"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`${page.shown ? "Hide" : "Show"} ${page.title}`}
                    disabled={saving === page.id}
                    onClick={() => setShown(page, !page.shown)}
                  >
                    {page.shown ? "Hide draft" : "Show draft"}
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
