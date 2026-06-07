import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { formatCurrency, withBase } from "../lib/utils";
import { categories, meta as budgetMeta } from "../lib/budget-data";
import { SHARE_API_BASE } from "../lib/share-api";

interface GalleryItem {
  slug: string;
  title: string;
  author_name: string | null;
  agree_count: number;
  created_at: string;
}

interface AggregateData {
  aggregate: Record<string, { mean: number; count: number }>;
  sampleSize: number;
}

export default function GalleryLoader() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [aggregate, setAggregate] = useState<AggregateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = SHARE_API_BASE;
    Promise.all([
      fetch(`${apiBase}/gallery`).then((r) => (r.ok ? r.json() : { budgets: [] })),
      fetch(`${apiBase}/aggregate`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([g, a]) => {
        setGallery(g.budgets ?? []);
        setAggregate(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-mesa-muted">Loading gallery…</div>;
  }

  const topPriorities = aggregate
    ? categories
        .map((c) => ({
          ...c,
          mean: aggregate.aggregate[c.id]?.mean ?? c.adoptedAmount,
          delta: (aggregate.aggregate[c.id]?.mean ?? c.adoptedAmount) - c.adoptedAmount,
        }))
        .filter((c) => Math.abs(c.delta) > 100_000)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 6)
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 md:max-w-4xl lg:max-w-5xl lg:px-6 lg:py-10">
      <header>
        <a href={withBase()} className="text-sm font-semibold text-mesa-blue md:text-base">← Back to simulator</a>
        <h1 className="mt-4 text-2xl font-bold text-mesa-ink lg:text-3xl">Community Budgets</h1>
        <p className="mt-2 text-mesa-muted lg:text-lg">See what Mesa residents prioritized when building their budgets.</p>
      </header>

      {aggregate && aggregate.sampleSize > 0 && (
        <Card>
          <h2 className="font-bold text-mesa-ink">What Mesa prioritized</h2>
          <p className="text-sm text-mesa-muted">Based on {aggregate.sampleSize} shared budget{aggregate.sampleSize !== 1 ? "s" : ""} vs City adopted FY {budgetMeta.fiscalYear}</p>
          <ul className="mt-4 space-y-2">
            {topPriorities.map((c) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className={c.delta > 0 ? "text-mesa-blue font-medium" : "text-mesa-red font-medium"}>
                  {c.delta > 0 ? "+" : ""}{formatCurrency(c.delta, true)} avg
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section>
        <h2 className="font-bold text-mesa-ink mb-3">Recent budgets</h2>
        {gallery.length === 0 ? (
          <Card>
            <p className="text-mesa-muted">No shared budgets yet. Be the first!</p>
            <a href={withBase()} className="mt-4 inline-flex">
              <Button>Build your budget</Button>
            </a>
          </Card>
        ) : (
          <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {gallery.map((item) => (
              <li key={item.slug}>
                <Card className="flex items-center justify-between gap-3">
                  <div>
                    <a href={withBase(`b?slug=${item.slug}`)} className="font-semibold text-mesa-blue hover:underline">
                      {item.title}
                    </a>
                    {item.author_name && <p className="text-xs text-mesa-muted">by {item.author_name}</p>}
                  </div>
                  <div className="text-right text-xs text-mesa-muted">
                    {item.agree_count > 0 && <span>{item.agree_count} agree</span>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
