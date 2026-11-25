import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskVisit = {
  id: string;
  name: string;
  phone: string;
  preferredAt: string;
  kind: string;
  status: "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
};

export function AdminAppointmentsPage() {
  const user = useStaffSession((state) => state.user);
  const [visits, setVisits] = useState<DeskVisit[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  useSeo("Appointments — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ appointments: DeskVisit[] }>("/api/v1/admin/appointments")
      .then((body) => setVisits(body.appointments))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The visits could not be opened.",
        ),
      );
  }, [user]);

  function updateStatus(visit: DeskVisit, status: DeskVisit["status"]) {
    setSaving(visit.id);
    setNote("");
    void staffFetch<{ appointment: DeskVisit }>(
      `/api/v1/admin/appointments/${encodeURIComponent(visit.id)}`,
      { method: "POST", body: JSON.stringify({ status }) },
    )
      .then((body) => {
        setVisits((current) =>
          current.map((item) =>
            item.id === body.appointment.id ? body.appointment : item,
          ),
        );
      })
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The appointment was not changed.",
        ),
      )
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Appointments</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A request stays on the desk. The boutique is not emailed. Confirm the
          time on WhatsApp.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Visit</th>
            <th>Requested</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visits.length === 0 ? (
            <tr>
              <td colSpan={4}>No visits are requested.</td>
            </tr>
          ) : (
            visits.map((visit) => (
              <tr key={visit.id}>
                <td>
                  <strong>{visit.name}</strong>
                  <p>{visit.phone}</p>
                </td>
                <td>
                  <p>{visit.kind}</p>
                  <p>{visit.preferredAt}</p>
                </td>
                <td>
                  {new Date(visit.createdAt).toLocaleString("en-AE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Dubai",
                  })}
                </td>
                <td>
                  <select
                    aria-label={`Appointment status for ${visit.name}`}
                    value={visit.status}
                    disabled={saving === visit.id}
                    onChange={(event) =>
                      updateStatus(
                        visit,
                        event.target.value as DeskVisit["status"],
                      )
                    }
                  >
                    <option value="REQUESTED">Requested</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
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
