export async function requestAppointment(input: { name: string; phone: string; preferredAt: string; kind: "fitting" | "consultation" }) {
  const response = await fetch("/api/v1/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The request was not saved.");
  }
}
