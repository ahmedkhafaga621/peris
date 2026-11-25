import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "NEW" | "HANDLED";
  createdAt: string;
};

export function AdminMessagesPage() {
  const user = useStaffSession((state) => state.user);
  const [messages, setMessages] = useState<DeskMessage[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  useSeo("Messages — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ messages: DeskMessage[] }>("/api/v1/admin/messages")
      .then((body) => setMessages(body.messages))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The messages could not be opened.",
        ),
      );
  }, [user]);

  function updateStatus(message: DeskMessage, status: DeskMessage["status"]) {
    setSaving(message.id);
    setNote("");
    void staffFetch<{ message: DeskMessage }>(
      `/api/v1/admin/messages/${encodeURIComponent(message.id)}`,
      { method: "POST", body: JSON.stringify({ status }) },
    )
      .then((body) => {
        setMessages((current) =>
          current.map((item) =>
            item.id === body.message.id ? body.message : item,
          ),
        );
      })
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The message was not changed.",
        ),
      )
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Messages</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A message stays on the desk. The boutique is not emailed.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>From</th>
            <th>Message</th>
            <th>Received</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {messages.length === 0 ? (
            <tr>
              <td colSpan={4}>No messages are on the desk.</td>
            </tr>
          ) : (
            messages.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  <p>{row.email}</p>
                  <p>{row.phone}</p>
                </td>
                <td>{row.message}</td>
                <td>
                  {new Date(row.createdAt).toLocaleString("en-AE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Dubai",
                  })}
                </td>
                <td>
                  <select
                    aria-label={`Message status from ${row.name}`}
                    value={row.status}
                    disabled={saving === row.id}
                    onChange={(event) =>
                      updateStatus(
                        row,
                        event.target.value as DeskMessage["status"],
                      )
                    }
                  >
                    <option value="NEW">New</option>
                    <option value="HANDLED">Handled</option>
                  </select>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}
