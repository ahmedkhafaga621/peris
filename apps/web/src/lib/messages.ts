export async function sendContactMessage(input: { name: string; email: string; phone: string; message: string }) {
  const response = await fetch("/api/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The message was not saved.");
  }
}
