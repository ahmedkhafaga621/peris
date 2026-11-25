import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskSubscriber = {
  id: string;
  email: string;
  createdAt: string;
};

export function AdminNewsletterPage() {
  const user = useStaffSession((state) => state.user);
  const [subscribers, setSubscribers] = useState<DeskSubscriber[]>([]);
  const [note, setNote] = useState("");
  useSeo("Notes — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ subscribers: DeskSubscriber[] }>("/api/v1/admin/newsletter")
      .then((body) => setSubscribers(body.subscribers))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The list could not be opened."));
  }, [user]);

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Notes</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Addresses stay on the desk. Email is not sent.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {subscribers.length === 0 ? (
            <tr>
              <td colSpan={2}>No addresses are on the list.</td>
            </tr>
          ) : (
            subscribers.map((subscriber) => (
              <tr key={subscriber.id}>
                <td>{subscriber.email}</td>
                <td>
                  {new Date(subscriber.createdAt).toLocaleString("en-AE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Dubai",
                  })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}
