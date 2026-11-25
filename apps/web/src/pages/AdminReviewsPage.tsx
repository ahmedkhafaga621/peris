import { useEffect, useState } from "react";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskReview = {
  id: string;
  body: string;
  rating: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  name: string;
  productName: string;
};

const statusLabel: Record<DeskReview["status"], string> = {
  PENDING: "Pending",
  APPROVED: "On the shop",
  REJECTED: "Hidden",
};

export function AdminReviewsPage() {
  const user = useStaffSession((state) => state.user);
  const [reviews, setReviews] = useState<DeskReview[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  useSeo("Reviews — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ reviews: DeskReview[] }>("/api/v1/admin/reviews")
      .then((body) => setReviews(body.reviews))
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The notes could not be opened."));
  }, [user]);

  function decide(review: DeskReview, status: "APPROVED" | "REJECTED") {
    setSaving(review.id);
    setNote("");
    void staffFetch<{ review: DeskReview }>(`/api/v1/admin/reviews/${encodeURIComponent(review.id)}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    })
      .then((body) => {
        setReviews((current) => current.map((item) => (item.id === body.review.id ? body.review : item)));
      })
      .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The note was not changed."))
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Reviews</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A note stays off the shop until it is published. Hiding it returns the homepage to the sample notes.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Note</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 ? (
            <tr>
              <td colSpan={2}>No note is on the desk.</td>
            </tr>
          ) : (
            reviews.map((review) => (
              <tr key={review.id}>
                <td>
                  <strong>
                    {review.name}, {review.productName}
                  </strong>
                  <p>
                    {review.rating} of 5. {review.body}
                  </p>
                </td>
                <td>
                  <p>{statusLabel[review.status]}</p>
                  {review.status === "APPROVED" ? (
                    <button
                      type="button"
                      className="btn btn-line"
                      aria-label={`Hide the note from ${review.name}`}
                      disabled={saving === review.id}
                      onClick={() => decide(review, "REJECTED")}
                    >
                      Hide note
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-line"
                      aria-label={`Publish the note from ${review.name}`}
                      disabled={saving === review.id}
                      onClick={() => decide(review, "APPROVED")}
                    >
                      Publish note
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminChrome>
  );
}
