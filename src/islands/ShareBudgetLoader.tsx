import { useEffect, useState } from "react";
import BudgetSimulator from "./BudgetSimulator";
import { withBase } from "../lib/utils";
import { SHARE_API_BASE } from "../lib/share-api";

export default function ShareBudgetLoader() {
  const [snapshot, setSnapshot] = useState<{
    title?: string;
    authorName?: string;
    categoryAmounts: Record<string, number>;
    revenueAmounts: Record<string, number>;
    multiFund?: unknown;
  } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const pathAfterBase = window.location.pathname.startsWith(base)
      ? window.location.pathname.slice(base.length)
      : window.location.pathname;
    const slug =
      params.get("slug") ?? pathAfterBase.replace(/^\/b\/?/, "").split("/").filter(Boolean)[0] ?? "";
    if (!slug || slug === "index.html") {
      setError(true);
      setLoading(false);
      return;
    }

    const apiBase = SHARE_API_BASE;
    fetch(`${apiBase}/budgets/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setSnapshot(data);
        document.title = data.title ? `${data.title} | Mesa Budget` : document.title;
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-mesa-muted">
        Loading shared budget…
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-mesa-ink">Budget not found</h1>
        <p className="mt-2 text-mesa-muted">This share link may be invalid or the API is offline.</p>
        <a href={withBase()} className="mt-4 inline-block text-mesa-blue underline">Build your own budget</a>
      </div>
    );
  }

  return <BudgetSimulator initialSnapshot={snapshot} readOnly={false} />;
}
