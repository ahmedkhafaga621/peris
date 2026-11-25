import { useEffect } from "react";

export function useSeo(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (!description) return;
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute("content", description);
  }, [title, description]);
}
